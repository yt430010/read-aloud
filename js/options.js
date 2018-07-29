
Promise.all([getVoices(), getSettings(), domReady()])
  .then(spread(initialize));

function initialize(allVoices, settings) {
  setI18nText();

  //sliders
  $(".slider").each(function() {
    $(this).slider({
      min: $(this).data("min"),
      max: $(this).data("max"),
      step: $(this).data("step")
    })
  });

  //voices
  var selectedLangs = settings.languages && settings.languages.split(',');
  var voices = !selectedLangs ? allVoices : allVoices.filter(
    function(voice) {
      return !voice.lang || selectedLangs.includes(voice.lang.split('-',1)[0]);
    });
  var groups = groupVoices(voices, function(v) {return isPremiumVoice(v.voiceName)});
  if (!groups[true]) groups[true] = [];
  if (!groups[false]) groups[false] = [];
  groups[true].sort(voiceSorter);
  groups[false].sort(voiceSorter);
  var standard = $("<optgroup>")
    .attr("label", brapi.i18n.getMessage("options_voicegroup_standard"))
    .appendTo($("#voices"));
  groups[false].forEach(function(voice) {
    $("<option>")
      .val(voice.voiceName)
      .text(voice.voiceName)
      .appendTo(standard);
  });
  $("<optgroup>").appendTo($("#voices"));
  var premium = $("<optgroup>")
    .attr("label", brapi.i18n.getMessage("options_voicegroup_premium"))
    .appendTo($("#voices"));
  groups[true].forEach(function(voice) {
    $("<option>")
      .val(voice.voiceName)
      .text(voice.voiceName)
      .appendTo(premium);
  });
  $("#voices")
    .val(settings.voiceName || "")
    .change(function() {
      updateSettings({voiceName: $(this).val()}).then(showSaveConfirmation);
    });

  $("#languages-edit-button").click(function() {
    location.href = "languages.html";
  })

  //rate
  $("#rate-edit-button").click(function() {
    $("#rate, #rate-input-div").toggle();
  });
  $("#rate")
    .slider("value", Math.log(settings.rate || defaults.rate) / Math.log($("#rate").data("pow")))
    .on("slidechange", function() {
      var val = Math.pow($(this).data("pow"), $(this).slider("value"));
      $("#rate-input").val(val.toFixed(3));
      $("#rate-warning").toggle(val > 2);
      saveRateSetting();
    });
  $("#rate-input")
    .val(settings.rate || defaults.rate)
    .change(function() {
      var val = $(this).val().trim();
      if (isNaN(val)) $(this).val(1);
      else if (val < .1) $(this).val(.1);
      else if (val > 10) $(this).val(10);
      else $("#rate-edit-button").hide();
      $("#rate-warning").toggle(val > 2);
      saveRateSetting();
    });
  $("#rate-warning")
    .toggle((settings.rate || defaults.rate) > 2);
  function saveRateSetting() {
    updateSettings({rate: Number($("#rate-input").val())}).then(showSaveConfirmation);
  }

  //pitch
  $("#pitch")
    .slider("value", settings.pitch || defaults.pitch)
    .on("slidechange", function() {
      updateSettings({pitch: $(this).slider("value")}).then(showSaveConfirmation);
    })

  //volume
  $("#volume")
    .slider("value", settings.volume || defaults.volume)
    .on("slidechange", function() {
      updateSettings({volume: $(this).slider("value")}).then(showSaveConfirmation);
    })

  //showHighlighting
  $("[name=highlighting]")
    .prop("checked", function() {
      return $(this).val() == (settings.showHighlighting != null ? settings.showHighlighting : defaults.showHighlighting);
    })
    .change(function() {
      updateSettings({showHighlighting: Number($(this).val())}).then(showSaveConfirmation);
    })

  //buttons
  $("#reset").click(function() {
    clearSettings().then(() => location.reload());
  });

  //hot key
  $("#hotkeys-link").click(function() {
    brapi.tabs.create({url: getHotkeySettingsUrl()});
  });
}


function groupVoices(voices, keySelector) {
  var groups = {};
  for (var i=0; i<voices.length; i++) {
    var key = keySelector(voices[i]);
    if (groups[key]) groups[key].push(voices[i]);
    else groups[key] = [voices[i]];
  }
  return groups;
}

function voiceSorter(a,b) {
  if (isRemoteVoice(a.voiceName)) {
    if (isRemoteVoice(b.voiceName)) return a.voiceName.localeCompare(b.voiceName);
    else return 1;
  }
  else {
    if (isRemoteVoice(b.voiceName)) return -1;
    else return a.voiceName.localeCompare(b.voiceName);
  }
}

function showSaveConfirmation() {
  $(".status.success").finish().show().delay(500).fadeOut();
}
