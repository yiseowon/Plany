// config.js
const CONFIG = {
    // 1. Google Cloud Console에서 발급받은 지도 API 키
    // (Maps JS, Places, Directions, Geocoding API가 모두 활성화되어 있어야 함)
    GOOGLE_API_KEY: "AIzaSyA7YAQTsCKXdRbOPa3xEFlZIjNlCF75vo0",

    // 2. Firebase Console에서 발급받은 설정값
    // (Authentication(Google), Firestore가 활성화되어 있어야 함)
    FIREBASE: {
        apiKey: "AIzaSyD7T4qD7V5756k_1C6k4pYGn6Q_E1EDa7A",
        authDomain: "maps-5fe2c.firebaseapp.com",
        projectId: "maps-5fe2c",
        storageBucket: "maps-5fe2c.firebasestorage.app",
        messagingSenderId: "983923017314",
        appId: "1:983923017314:web:4f017d47ab7ec92895333b"
    },
    OPENWEATHER_API_KEY: "87d567146e866f7d68a37e2983cd3ed5"
};