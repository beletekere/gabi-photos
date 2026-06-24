const firebaseConfig = {
    apiKey: "AIzaSyBpZTZsAyDGX9lSc3hMPpA5Z3kAP6_aK7A",
    authDomain: "gabi-photos.firebaseapp.com",
    projectId: "gabi-photos",
    storageBucket: "gabi-photos.firebasestorage.app",
    messagingSenderId: "444583364997",
    appId: "1:444583364997:web:f7751b35d0321961335cec"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
