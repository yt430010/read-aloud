
(function() {
  if (window.chrome && chrome.ttsEngine) {
    var engine = window.remoteTtsEngine = new RemoteTTS(config.serviceUrl);
    chrome.ttsEngine.onSpeak.addListener(engine.speak);
    chrome.ttsEngine.onStop.addListener(engine.stop);
    chrome.ttsEngine.onPause.addListener(engine.pause);
    chrome.ttsEngine.onResume.addListener(engine.resume);
  }
})();


function RemoteTTS(host) {
  var iOS = !!navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform);
  var audio = window.ttsAudio || (window.ttsAudio = document.createElement("AUDIO"));
  var prefetchAudio = document.createElement("AUDIO");
  var nextStartTime = 0;
  var waitTimer;
  var polly;

  this.speak = function(utterance, options, onEvent) {
    if (!options.volume) options.volume = 1;
    if (!options.rate) options.rate = 1;
    if (!onEvent) onEvent = options.onEvent;
    audio.pause();
    if (!iOS) {
      audio.volume = options.volume;
      audio.defaultPlaybackRate = options.rate;
    }
    audio.oncanplay = function() {
      var waitTime = nextStartTime - new Date().getTime();
      if (waitTime > 0) waitTimer = setTimeout(audio.play.bind(audio), waitTime);
      else audio.play();
    };
    audio.onplay = onEvent.bind(null, {type: 'start', charIndex: 0});
    audio.onended = onEvent.bind(null, {type: 'end', charIndex: utterance.length});
    audio.onerror = function() {
      onEvent({type: "error", errorMessage: audio.error.message});
    };
    return Promise.resolve(usePolly(options.voiceName) && pollyReady())
      .then(function() {
        if (polly) return pollySynthesizeSpeech(utterance, options.voiceName.match(/\((\w+)\)/)[1]);
        else return getAudioUrl(utterance, options.lang, options.voiceName);
      })
      .then(function(url) {
        audio.src = url;
        audio.load();
      })
      .catch(function(err) {
        onEvent({type: "error", errorMessage: err.message});
      })
  }

  this.isSpeaking = function(callback) {
    callback(audio.currentTime && !audio.paused && !audio.ended);
  }

  this.pause =
  this.stop = function() {
    clearTimeout(waitTimer);
    audio.pause();
  }

  this.resume = function() {
    audio.play();
  }

  this.prefetch = function(utterance, options) {
    if (usePolly(options.voiceName)) return;
    prefetchAudio.src = getAudioUrl(utterance, options.lang, options.voiceName);
  }

  this.setNextStartTime = function(time) {
    nextStartTime = time || 0;
  }

  function getAudioUrl(utterance, lang, voiceName) {
    return host + "/read-aloud/speak/" + lang + "/" + encodeURIComponent(voiceName) + "?q=" + encodeURIComponent(utterance);
  }

  function usePolly(voiceName) {
    return voiceName == "Amazon US English (Matthew)" || voiceName == "Amazon US English (Joanna)";
  }

  function pollyReady() {
    if (polly) return Promise.resolve();
    return getSettings(["awsCreds"])
      .then(function(items) {return items.awsCreds})
      .then(function(creds) {
        if (creds) polly = new AWS.Polly(Object.assign({region: "us-east-1"}, creds));
      })
  }

  function pollySynthesizeSpeech(utterance, voiceId) {
    return new Promise(function(fulfill, reject) {
      polly.synthesizeSpeech({
        OutputFormat: "mp3",
        Text: utterance,
        VoiceId: voiceId
      },
      function(err, data) {
        if (err) reject(err);
        else fulfill(new Blob([data.AudioStream], {type: data.ContentType}));
      })
    })
    .then(function(blob) {
      return URL.createObjectURL(blob);
    })
  }
}
