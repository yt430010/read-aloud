
$(function() {
  getSettings(["awsCreds"])
    .then(function(items) {return items.awsCreds})
    .then(function(creds) {
      if (creds) {
        $("#access-key-id").val(creds.accessKeyId);
        $("#secret-access-key").val(creds.secretAccessKey);
      }
    })

  $("#save-button").click(save);
})

function save() {
  var accessKeyId = $("#access-key-id").val().trim();
  var secretAccessKey = $("#secret-access-key").val().trim();
  if (accessKeyId && secretAccessKey) {
    updateSettings({
      awsCreds: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey
      }
    });
    $("#status").css("color", "#060").text("Saved.");
  }
  else {
    $("#status").css("color", "red").text("Missing required fields.");
  }
}
