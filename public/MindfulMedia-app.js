let GoogleAuth;
let SCOPE = 'https://www.googleapis.com/auth/youtube.readonly';
let database = firebase.database();

function getChannelIds() {
  return gapi.client.youtube.subscriptions.list({'part': 'snippet', 'mine': 'true', 'maxResults': 50});
}

function parseChannelResults(results) {
  let channels = results.result.items;
  let channelIds = [];

  for (let i = 0; i < channels.length; i++) {
    channelIds.push(channels[i].snippet.resourceId.channelId);
  }

  return channelIds;
}

function getVideoIds(channelId) {
  let today = new Date();
  let dd = String(today.getDate()).padStart(2, '0');
  // let dd = 07;
  let mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
  let yyyy = today.getFullYear();
    today = yyyy + '-' + mm + '-' + dd;

  let requestList = {'part':'contentDetails','publishedAfter':`${today}T00:00:00.0Z`, 'channelId': channelId};

  return gapi.client.youtube.activities.list(requestList)
}

function renderVideos (videos, writediv) {

  for (var i = 0; i < videos.length; i++) {
      document.getElementById(writediv).innerHTML += "<div class='row'><div id='player_" + videos[i]+ "' class='p-4 align-self-center'></div></div>";
  }

  $('#collapseBtn').html('');

  // create youtube players
  (function onYouTubePlayerAPIReady() {
      let player = [];
      for (var j = 0; j < videos.length; j++) {  
          player[j] = new YT.Player('player_' + videos[j], {
          height: '480',
          width: '640',
          videoId: videos[j],
          playerVars: {
              modestbranding: 1,
              rel: 0
          },
          events: {'onStateChange': onPlayerStateChange}
          });
      }
  })();

  // Dissapear when video ends
  function onPlayerStateChange(event) {
    let watchedVideos = [].concat(JSON.parse(localStorage.getItem('watchedVideos')));
    let videoId = event.target.playerInfo.videoData.video_id;
    let videoPlayer = $(`#player_${videoId}`)
    //console.log('player_2va7EEt-t4A');
    //console.log(event);
    // console.log($(`player_${videoId}`).parent());

    if(event.data === 0) {            
        videoPlayer.addClass("fadeOut animated");
        setTimeout(function(){ videoPlayer.remove(); }, 1000);
        watchedVideos.push(videoId.split('player_')[1]);
        localStorage.setItem('watchedVideos', JSON.stringify(watchedVideos));
    }
  }
}

function handleClientLoad(YouTubeAPIKey, YouTubeClientId) {
  // Load the API's client and auth2 modules.
  // Call the initClient function after the modules load.
  gapi.YouTubeAPIKey = YouTubeAPIKey;
  gapi.YouTubeClientId = YouTubeClientId;
  gapi.load('client:auth2', initClient);

}

function initClient() {
  // Retrieve the discovery document for version 3 of YouTube Data API.
  // In practice, your app can retrieve one or more discovery documents.
  let discoveryUrl = 'https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest';

  // Initialize the gapi.client object, which app uses to make API requests.
  // Get API key and client ID from API Console.
  // 'scope' field specifies space-delimited list of access scopes.
  gapi.client.init({
      'apiKey': gapi.YouTubeAPIKey,
      'discoveryDocs': [discoveryUrl],
      'clientId': gapi.YouTubeClientId,
      'scope': SCOPE
  }).then(function () {
    GoogleAuth = gapi.auth2.getAuthInstance();

    // Listen for sign-in state changes.
    GoogleAuth.isSignedIn.listen(updateSigninStatus);

    // Handle initial sign-in state. (Determine if user is already signed in.)
    let user = GoogleAuth.currentUser.get();  
    setSigninStatus();

    // Call handleAuthClick function when user clicks on
    //      "Sign In/Authorize" button.
    $('#sign-in-or-out-button').click(function() {
      handleAuthClick();
    });
    $('#revoke-access-button').click(function() {
      revokeAccess();
    });

    let isAuthorized = user.hasGrantedScopes(SCOPE); 

    buttonWatcher(isAuthorized);

  });

}

function buttonWatcher(isAuthorized) {
  
  if (isAuthorized) {
    // Update prompt text and button
    $('#text_authorized').removeClass('hide');
    $('#text_not_authorized').addClass('hide');
    $('.object').removeClass('disabled');
    $('.arrow').removeClass('disabled');

    // Look For Youtube Subscriptions
    $('#collapseBtn').click(function() {

      // Render "working" throbber
      $('#collapseBtn').html(`
            <div class="d-flex justify-content-center mt-auto text-center" style="top: 100px;">
            <div class="spinner-grow text-danger" role="status" style="width: 3rem; height: 3rem; margin-top: 200px;">
            <span class="sr-only">Loading...</span></div></div>
            <div class=".google-button__text">Loading Your YouTube Subscriptions...</div>`)

      // Clear out old Videos that might be rendered
      $('#videos').html('');

      (async function talkToYoutube() {
        let results = await getChannelIds();
        let channelIds = parseChannelResults(results);
        let channelCount = 5 || channelIds.length
        let videoIds = []

        for (let i=0; i < channelCount; i++) {
          results = await getVideoIds(channelIds[i])
          if ( results.result.items.length ) {
            if ( results.result.items[0].contentDetails.hasOwnProperty('upload') ) {
              videoIds.push(results.result.items[0].contentDetails.upload.videoId)
            } 
          }
        }
        
        renderVideos(videoIds, 'videos');

      })()
    });
  } 
  else {
    // Update prompt text and button
    $('#text_not_authorized').removeClass('hide');
    $('#text_authorized').addClass('hide');
    $('.object').addClass('disabled');
    $('.arrow').addClass('disabled');

    // Remove button action
    $('#collapseBtn').click(function() { 
      console.log('Sorry, I\'m disabled...');
    });

  }
}

function handleAuthClick() {
  if (GoogleAuth.isSignedIn.get()) {
    // User is authorized and has clicked 'Sign out' button.
    GoogleAuth.signOut();
  } else {
    // User is not signed in. Start Google auth flow.
    GoogleAuth.signIn();
  }
}

function revokeAccess() {
  GoogleAuth.disconnect();
}

function setSigninStatus(isSignedIn) {
  let user = GoogleAuth.currentUser.get();
  let isAuthorized = user.hasGrantedScopes(SCOPE);
  if (isAuthorized) {
    $('#sign-in-or-out-button').html('<span class="google-button__icon"><svg viewBox="0 0 366 372" xmlns="http://www.w3.org/2000/svg"><path d="M125.9 10.2c40.2-13.9 85.3-13.6 125.3 1.1 22.2 8.2 42.5 21 59.9 37.1-5.8 6.3-12.1 12.2-18.1 18.3l-34.2 34.2c-11.3-10.8-25.1-19-40.1-23.6-17.6-5.3-36.6-6.1-54.6-2.2-21 4.5-40.5 15.5-55.6 30.9-12.2 12.3-21.4 27.5-27 43.9-20.3-15.8-40.6-31.5-61-47.3 21.5-43 60.1-76.9 105.4-92.4z" id="Shape" fill="#EA4335"/><path d="M20.6 102.4c20.3 15.8 40.6 31.5 61 47.3-8 23.3-8 49.2 0 72.4-20.3 15.8-40.6 31.6-60.9 47.3C1.9 232.7-3.8 189.6 4.4 149.2c3.3-16.2 8.7-32 16.2-46.8z" id="Shape" fill="#FBBC05"/><path d="M361.7 151.1c5.8 32.7 4.5 66.8-4.7 98.8-8.5 29.3-24.6 56.5-47.1 77.2l-59.1-45.9c19.5-13.1 33.3-34.3 37.2-57.5H186.6c.1-24.2.1-48.4.1-72.6h175z" id="Shape" fill="#4285F4"/><path d="M81.4 222.2c7.8 22.9 22.8 43.2 42.6 57.1 12.4 8.7 26.6 14.9 41.4 17.9 14.6 3 29.7 2.6 44.4.1 14.6-2.6 28.7-7.9 41-16.2l59.1 45.9c-21.3 19.7-48 33.1-76.2 39.6-31.2 7.1-64.2 7.3-95.2-1-24.6-6.5-47.7-18.2-67.6-34.1-20.9-16.6-38.3-38-50.4-62 20.3-15.7 40.6-31.5 60.9-47.3z" fill="#34A853"/></svg></span><span class="google-button__text">Sign Out</span>');
    $('#auth-status').html('You are currently signed in and have granted ' +
        'access to this app.');
    buttonWatcher(isAuthorized);
  } else {
    $('#sign-in-or-out-button').html('<span class="google-button__icon"><svg viewBox="0 0 366 372" xmlns="http://www.w3.org/2000/svg"><path d="M125.9 10.2c40.2-13.9 85.3-13.6 125.3 1.1 22.2 8.2 42.5 21 59.9 37.1-5.8 6.3-12.1 12.2-18.1 18.3l-34.2 34.2c-11.3-10.8-25.1-19-40.1-23.6-17.6-5.3-36.6-6.1-54.6-2.2-21 4.5-40.5 15.5-55.6 30.9-12.2 12.3-21.4 27.5-27 43.9-20.3-15.8-40.6-31.5-61-47.3 21.5-43 60.1-76.9 105.4-92.4z" id="Shape" fill="#EA4335"/><path d="M20.6 102.4c20.3 15.8 40.6 31.5 61 47.3-8 23.3-8 49.2 0 72.4-20.3 15.8-40.6 31.6-60.9 47.3C1.9 232.7-3.8 189.6 4.4 149.2c3.3-16.2 8.7-32 16.2-46.8z" id="Shape" fill="#FBBC05"/><path d="M361.7 151.1c5.8 32.7 4.5 66.8-4.7 98.8-8.5 29.3-24.6 56.5-47.1 77.2l-59.1-45.9c19.5-13.1 33.3-34.3 37.2-57.5H186.6c.1-24.2.1-48.4.1-72.6h175z" id="Shape" fill="#4285F4"/><path d="M81.4 222.2c7.8 22.9 22.8 43.2 42.6 57.1 12.4 8.7 26.6 14.9 41.4 17.9 14.6 3 29.7 2.6 44.4.1 14.6-2.6 28.7-7.9 41-16.2l59.1 45.9c-21.3 19.7-48 33.1-76.2 39.6-31.2 7.1-64.2 7.3-95.2-1-24.6-6.5-47.7-18.2-67.6-34.1-20.9-16.6-38.3-38-50.4-62 20.3-15.7 40.6-31.5 60.9-47.3z" fill="#34A853"/></svg></span><span class="google-button__text">Sign in with Google</span>');
    $('#auth-status').html('You have not authorized this app or you are ' +
        'signed out.');
    buttonWatcher(isAuthorized);
  }
}

function updateSigninStatus(isSignedIn) {
  setSigninStatus();
}

function writeAPIData(key, clientId, applicationName) {
  firebase.database().ref('keys/' + applicationName).set({
    application: applicationName,
    key: key,
    clientId: clientId
  });
}
// writeAPIData(key, clientId, applicationName)

function writeUserData(userId, name, email) {
  firebase.database().ref('users/' + userId).set({
    username: name,
    email: email
  });
}

function getYouTubeKey() {
  return firebase.database().ref('/keys/YouTube').once('value');
}

(async function(){
  let results;
  let YouTubeAPIKey;
  let YouTubeClientId;
  results = await getYouTubeKey();
  YouTubeAPIKey = (results.val() && results.val().key) || '';
  YouTubeClientId = (results.val() && results.val().clientId) || '';

  handleClientLoad(YouTubeAPIKey, YouTubeClientId);
})()