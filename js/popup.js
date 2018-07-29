
var showGotoPage;

$(function() {
  $("#btnPlay").click(function() {
    getBackgroundPage()
      .then(function(master) {
        return master.play(function(err) {
            if (err) showError(err);
          })
          .then(updateButtons)
          .then(master.getDocInfo)
          .then(function(docInfo) {return setState("lastUrl", docInfo && docInfo.url)})
          .catch(function(err) {
            if (err.stack) {
              master.reportIssue(null, err.stack.startsWith(err.name) ? err.stack : (err.name + ": " + err.message + "\n" + err.stack));
            }
            showError(err);
          });
      })
  });
  $("#btnPause").click(function() {getBackgroundPage().then(callMethod("pause")).then(updateButtons)});
  $("#btnStop").click(function() {getBackgroundPage().then(callMethod("stop")).then(updateButtons)});
  $("#btnSettings").click(function() {location.href = "options.html"});
  $("#btnForward").click(function() {getBackgroundPage().then(callMethod("forward")).then(updateButtons)});
  $("#btnRewind").click(function() {getBackgroundPage().then(callMethod("rewind")).then(updateButtons)});
  $("#resize").click(function() {
    getSettings(["highlightWindowSize"])
      .then(function(settings) {
        updateSettings({highlightWindowSize: ((settings.highlightWindowSize || 0) + 1) % 3});
        updateSize();
      })
  })

  updateButtons()
    .then(getBackgroundPage)
    .then(callMethod("getPlaybackState"))
    .then(function(state) {
      if (state != "PLAYING") $("#btnPlay").click();
    });
  setInterval(updateButtons, 500);

  updateSize();
  checkAnnouncements();
});

function showError(err) {
  if (/^{/.test(err.message)) $("#status").text(formatError(JSON.parse(err.message)) || err.message).show();
  else $("#status").text(err.message).show();
}

function updateButtons() {
  return getBackgroundPage().then(function(master) {
    return Promise.all([
      getSettings(),
      master.getPlaybackState(),
      master.getActiveSpeech()
    ])
  })
  .then(spread(function(settings, state, speech) {
    $("#imgLoading").toggle(state == "LOADING");
    $("#btnSettings").toggle(state == "STOPPED");
    $("#btnPlay").toggle(state == "PAUSED" || state == "STOPPED");
    $("#btnPause").toggle(state == "PLAYING");
    $("#btnStop").toggle(state == "PAUSED" || state == "PLAYING" || state == "LOADING");
    $("#btnForward, #btnRewind").toggle(state == "PLAYING");
    $("#attribution").toggle(Boolean(speech && isGoogleTranslate(speech.options.voice.voiceName)));
    $("#highlight, #resize").toggle(Boolean(settings.showHighlighting != null ? settings.showHighlighting : defaults.showHighlighting) && (state == "PAUSED" || state == "PLAYING"));

    if (settings.showHighlighting && speech) {
      var pos = speech.getPosition();
      var elem = $("#highlight");
      if (elem.data("texts") != pos.texts) {
        elem.data({texts: pos.texts, index: -1});
        elem.empty();
        for (var i=0; i<pos.texts.length; i++) {
          var html = escapeHtml(pos.texts[i]).replace(/\r?\n/g, "<br/>");
          $("<span>").html(html).appendTo(elem);
        }
      }
      if (elem.data("index") != pos.index) {
        elem.data("index", pos.index);
        elem.children(".active").removeClass("active");
        var child = elem.children().eq(pos.index).addClass("active");
        if (child.length) {
        var childTop = child.position().top;
        var childBottom = childTop + child.outerHeight();
        if (childTop < 0 || childBottom >= elem.height()) elem.animate({scrollTop: elem[0].scrollTop + childTop - 10});
        }
      }
    }
  }));
}

function updateSize() {
  getSettings(["highlightWindowSize"])
    .then(function(settings) {
      switch (settings.highlightWindowSize) {
        case 2: return [720, 420];
        case 1: return [520, 390];
        default: return [400, 300];
      }
    })
    .then(function(size) {
      $("#highlight").css({width: size[0], height: size[1]});
    })
}

function checkAnnouncements() {
  var now = new Date().getTime();
  getSettings(["announcement"])
    .then(function(settings) {
      var ann = settings.announcement;
      if (ann && ann.expire > now)
        return ann;
      else
        return ajaxGet(config.serviceUrl + "/read-aloud/announcement")
          .then(JSON.parse)
          .then(function(result) {
            result.expire = now + 6*3600*1000;
            if (ann && result.id == ann.id) {
              result.lastShown = ann.lastShown;
              result.disabled = ann.disabled;
            }
            updateSettings({announcement: result});
            return result;
          })
    })
    .then(function(ann) {
      if (ann.text && !ann.disabled) {
        if (!ann.lastShown || now-ann.lastShown > ann.period*60*1000) {
          showAnnouncement(ann);
          ann.lastShown = now;
          updateSettings({announcement: ann});
        }
      }
    })
}

function showAnnouncement(ann) {
  var html = escapeHtml(ann.text).replace(/\[(.*?)\]/g, "<a target='_blank' href='" + ann.link + "'>$1</a>").replace(/\n/g, "<br/>");
  $("#footer").html(html).addClass("announcement");
  if (ann.disableIfClick)
    $("#footer a").click(function() {
      ann.disabled = true;
      updateSettings({announcement: ann});
    })
}
