  // Your web app's Firebase configuration
  var firebaseConfig = {
    apiKey: "AIzaSyCKhrlsgvJ0oiXF5xo6us1m8B0xGRApR88",
    authDomain: "striblet-2c0ae.firebaseapp.com",
    databaseURL: "https://striblet-2c0ae.firebaseio.com",
    projectId: "striblet-2c0ae",
    storageBucket: "striblet-2c0ae.appspot.com",
    messagingSenderId: "472836326493",
    appId: "1:472836326493:web:77ebb8c2ae8fdf49abb9b4",
    measurementId: "G-8HJDG9DJ20"
  };
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  firebase.database();


    function saveToFirebase(email) {
        var emailObject = {
            email: email
        };

        firebase.database().ref('subscription-entries').push().set(emailObject)
            .then(function(snapshot) {
                success(); // some success method
            }, function(error) {
                console.log('error' + error);
                error(); // some error method
        });
    }