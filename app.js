import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    GoogleAuthProvider, 
    browserLocalPersistence,
    getRedirectResult,
    signInWithPopup, 
    signInWithRedirect,
    signOut, 
    setPersistence,
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc, 
    updateDoc, 
    deleteDoc, 
    onSnapshot, 
    query, 
    where, 
    arrayUnion,
    arrayRemove 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const app = initializeApp(CONFIG.FIREBASE);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
auth.languageCode = 'ko';
provider.setCustomParameters({ prompt: 'select_account' });

let map;
let directionsService;
let Place, AdvancedMarkerElement, PinElement, Geometry;

let currentUser = null;
let currentTripId = null;
let currentTripData = null;
let currentDayIndex = 0;
let currentEditPlaceId = null;
let tempPlaceData = null;
let sortableInstance = null;

let mapMarkers = [];
let mapPolylines = [];
let mapRouteMarkers = [];

let memberProfileCache = {};
// 기존 변수들 아래에 추가
let currentChecklists = []; // 체크리스트 데이터 저장용
let tempExpenseBuffer = []; // 수정 중인 지출 내역을 임시 저장하는 곳

const LOCATION_DATA = {
    "KR": {
        name: "대한민국",
        regions: ["서울", "부산", "제주도", "인천", "강원도(강릉/속초)", "경기도(수원/가평)", "경상도(경주/포항)", "전라도(전주/여수)", "충청도", "대구", "대전", "광주", "울산"]
    },
    "JP": {
        name: "일본",
        regions: ["도쿄(Tokyo)", "오사카(Osaka)", "교토(Kyoto)", "후쿠오카(Fukuoka)", "삿포로(Sapporo)", "오키나와(Okinawa)", "나고야", "고베", "요코하마", "나라", "히로시마", "벳푸", "유후인", "센다이", "시즈오카"]
    },
    "CN": {
        name: "중국/홍콩/대만",
        regions: ["베이징", "상하이", "홍콩", "마카오", "타이베이", "가오슝", "칭다오", "장가계", "하이난", "청두", "시안"]
    },
    "VN": {
        name: "베트남",
        regions: ["다낭", "나트랑", "하노이", "호치민", "푸꾸옥", "달랏", "호이안", "사파", "무이네"]
    },
    "TH": {
        name: "태국",
        regions: ["방콕", "치앙마이", "푸켓", "파타야", "코사무이", "끄라비", "후아힌"]
    },
    "PH": { name: "필리핀", regions: ["세부", "보라카이", "마닐라", "보홀", "클락", "팔라완"] },
    "SG": { name: "싱가포르", regions: ["싱가포르 전체"] },
    "MY": { name: "말레이시아", regions: ["쿠알라룸푸르", "코타키나발루", "페낭", "랑카위"] },
    "ID": { name: "인도네시아", regions: ["발리", "자카르타", "롬복", "빈탄"] },
    
    "FR": { name: "프랑스", regions: ["파리", "니스", "리옹", "마르세유", "몽생미셸", "스트라스부르", "콜마르"] },
    "IT": { name: "이탈리아", regions: ["로마", "밀라노", "피렌체", "베네치아", "나폴리", "포지타노", "쏘렌토"] },
    "ES": { name: "스페인", regions: ["바르셀로나", "마드리드", "세비야", "그라나다", "발렌시아", "이비자"] },
    "UK": { name: "영국", regions: ["런던", "에든버러", "맨체스터", "리버풀", "옥스포드", "코츠월드"] },
    "DE": { name: "독일", regions: ["베를린", "뮌헨", "프랑크푸르트", "함부르크", "쾰른", "하이델베르크"] },
    "CH": { name: "스위스", regions: ["인터라켄", "취리히", "제네바", "루체른", "체르마트", "베른"] },
    "CZ": { name: "동유럽", regions: ["프라하(체코)", "부다페스트(헝가리)", "빈(오스트리아)", "잘츠부르크(오스트리아)"] },
    
    "US": {
        name: "미국",
        regions: ["뉴욕", "LA", "라스베이거스", "하와이", "샌프란시스코", "시애틀", "시카고", "올랜도", "마이애미", "보스턴", "워싱턴DC", "괌", "사이판"]
    },
    "CA": { name: "캐나다", regions: ["토론토", "밴쿠버", "몬트리올", "퀘벡", "나이아가라", "캘거리(밴프)"] },
    "AU": { name: "호주", regions: ["시드니", "멜버른", "골드코스트", "브리즈번", "퍼스", "케언즈"] },
    "NZ": { name: "뉴질랜드", regions: ["오클랜드", "퀸스타운", "크라이스트처치", "로토루아"] }
};

let tempDestinations = [];

function showPopup(title, msg, iconClass, showCancel = false, onConfirm = null) {
    const modal = document.getElementById('common-modal');
    if (!modal) return alert(msg);

    document.getElementById('common-modal-title').innerText = title;
    document.getElementById('common-modal-msg').innerText = msg;
    
    const iconContainer = document.getElementById('common-modal-icon');
    iconContainer.innerHTML = `<i class="${iconClass}"></i>`;
    
    if(iconClass.includes('check')) iconContainer.style.color = '#40c057';
    else if(iconClass.includes('exclamation') || iconClass.includes('trash')) iconContainer.style.color = '#fa5252';
    else iconContainer.style.color = '#4dabf7';

    const actions = document.getElementById('common-modal-actions');
    actions.innerHTML = '';

    const okBtn = document.createElement('button');
    okBtn.innerText = showCancel ? '네' : '확인';
    okBtn.className = 'btn-primary';
    okBtn.style.minWidth = '80px';
    okBtn.onclick = () => {
        closeModal('common-modal');
        if (onConfirm) onConfirm();
    };
    actions.appendChild(okBtn);

    if (showCancel) {
        const cancelBtn = document.createElement('button');
        cancelBtn.innerText = '아니요';
        cancelBtn.className = 'btn-secondary';
        cancelBtn.style.minWidth = '80px';
        cancelBtn.onclick = () => closeModal('common-modal');
        actions.appendChild(cancelBtn);
    }

    openModal('common-modal');
}

function showSuccess(msg) { showPopup("성공", msg, "fas fa-check-circle"); }
function showError(msg) { showPopup("오류", msg, "fas fa-exclamation-circle"); }
function showConfirm(msg, callback) { showPopup("확인", msg, "fas fa-question-circle", true, callback); }

document.addEventListener('DOMContentLoaded', async () => {
    
    const addListener = (id, event, handler) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, handler);
    };

    addListener('google-login-btn', 'click', handleLogin);
    addListener('logout-btn', 'click', handleLogout); 
    addListener('create-new-trip-btn', 'click', openCreateTripModal);
    addListener('trip-form', 'submit', createNewTrip);
    addListener('back-to-dashboard', 'click', () => showScreen('dashboard-screen'));
    
    addListener('place-search', 'input', handlePlaceSearch);
    addListener('optimize-route', 'click', optimizeRoute);
    addListener('copy-link-btn', 'click', copyInviteLink);
    addListener('save-place-btn', 'click', savePlaceDetails);
    addListener('recommend-places', 'click', recommendNearbyPlaces);
    addListener('book-ticket-btn', 'click', redirectToBooking);
    
    addListener('confirm-add-place-btn', 'click', confirmAddPlace);
    
    addListener('save-profile-btn', 'click', saveUserProfile);
    addListener('profile-file-input', 'change', handleProfileImagePreview);
    
    addListener('my-location-btn', 'click', handleMyLocation);

    addListener('trip-settings-form', 'submit', updateTripSettings);
    addListener('btn-delete-trip', 'click', deleteTrip);

    initLocationSelectors();
    setPersistence(auth, browserLocalPersistence).catch((e) => console.warn('Auth persistence setup failed:', e));
    getRedirectResult(auth).catch((e) => showError(formatAuthError(e)));

    const urlParams = new URLSearchParams(window.location.search);
    const inviteTripId = urlParams.get('invite');

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            await checkUserProfile(user);

            if (inviteTripId) {
                await joinTrip(inviteTripId);
                window.history.replaceState({}, document.title, window.location.pathname);
            } else {
                showScreen('dashboard-screen');
            }
            
            loadUserTrips();
            if(!map) initMapLibrary();
        } else {
            currentUser = null;
            showScreen('login-screen');
        }
    });
});

function initLocationSelectors() {
    const countrySelect = document.getElementById('select-country');
    const regionSelect = document.getElementById('select-region');
    const addBtn = document.getElementById('btn-add-region');

    if(!countrySelect) return;

    for (const [code, data] of Object.entries(LOCATION_DATA)) {
        const opt = document.createElement('option');
        opt.value = code;
        opt.innerText = data.name;
        countrySelect.appendChild(opt);
    }

    countrySelect.addEventListener('change', (e) => {
        const code = e.target.value;
        regionSelect.innerHTML = '<option value="">지역 선택</option>';
        
        if (code && LOCATION_DATA[code]) {
            regionSelect.disabled = false;
            LOCATION_DATA[code].regions.forEach(r => {
                const opt = document.createElement('option');
                opt.value = r;
                opt.innerText = r;
                regionSelect.appendChild(opt);
            });
        } else {
            regionSelect.disabled = true;
        }
    });

    addBtn.addEventListener('click', () => {
        const countryCode = countrySelect.value;
        const region = regionSelect.value;
        
        if (!countryCode || !region) return; 

        const fullText = `${region}, ${LOCATION_DATA[countryCode].name}`;
        if (tempDestinations.includes(fullText)) {
            showError("이미 추가된 지역입니다.");
            return;
        }

        tempDestinations.push(fullText);
        renderDestinationTags();
    });
}

function renderDestinationTags() {
    const container = document.getElementById('selected-regions-container');
    container.innerHTML = '';
    
    tempDestinations.forEach((dest, index) => {
        const tag = document.createElement('div');
        tag.className = 'location-tag';
        tag.innerHTML = `<span>${dest}</span> <i class="fas fa-times" onclick="removeDestinationTag(${index})"></i>`;
        container.appendChild(tag);
    });
}

window.removeDestinationTag = function(index) {
    tempDestinations.splice(index, 1);
    renderDestinationTags();
};

function openCreateTripModal() {
    tempDestinations = [];
    renderDestinationTags();
    document.getElementById('trip-form').reset();
    document.getElementById('select-region').innerHTML = '<option value="">지역 선택</option>';
    document.getElementById('select-region').disabled = true;
    openModal('setup-modal');
}

async function handleLogin() { 
    try {
        await setPersistence(auth, browserLocalPersistence);
        await signInWithPopup(auth, provider);
    } catch(e) {
        const code = e?.code || '';
        if (code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request') {
            await signInWithRedirect(auth, provider);
            return;
        }
        showError(formatAuthError(e));
    } 
}

function formatAuthError(error) {
    const code = error?.code || '';
    const host = window.location.hostname || '현재 도메인';

    if (code === 'auth/unauthorized-domain') {
        return `Firebase 로그인 승인 도메인에 ${host}가 없습니다. Firebase Console > Authentication > Settings > Authorized domains에 plany.life, www.plany.life, yiseowon.github.io, localhost를 추가해 주세요.`;
    }
    if (code === 'auth/operation-not-allowed') {
        return 'Firebase Authentication에서 Google 로그인 제공자가 꺼져 있습니다. Sign-in method에서 Google provider를 활성화해 주세요.';
    }
    if (code === 'auth/popup-closed-by-user') {
        return '로그인 창이 닫혔습니다. 다시 시도해 주세요.';
    }
    if (code === 'auth/network-request-failed') {
        return '네트워크 연결 문제로 로그인하지 못했습니다. 잠시 후 다시 시도해 주세요.';
    }
    return `로그인 실패: ${error?.message || '알 수 없는 오류가 발생했습니다.'}`;
}

function handleLogout() { 
    showConfirm("정말 로그아웃 하시겠습니까?", () => { 
        signOut(auth); 
        window.location.reload(); 
    }); 
}

async function checkUserProfile(user) {
    const userRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userRef);

    if (!docSnap.exists()) {
        const nickInput = document.getElementById('profile-nickname');
        const prevImg = document.getElementById('profile-preview');
        const defaultImg = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjYyI+PHBhdGggZD0iTTEyIDEyYzIuMjEgMCA0LTEuNzkgNC00czLTEuNzktNC00LTQtNCAxLjc5LTQgNCAxLjc5IDQgNCA0em0wIDJjLTIuNjcgMC04IDEuMzQtOCA0djJoMTZ2LTJjMC0yLjY2LTUuMzMtNC04LTR6Ii8+PC9zdmc+';
        
        if(nickInput) nickInput.value = user.displayName;
        if(prevImg) prevImg.src = user.photoURL || defaultImg;
        
        openModal('profile-modal');
    } else {
        updateDashboardProfile(docSnap.data());
    }
}

async function saveUserProfile() {
    const nickname = document.getElementById('profile-nickname').value;
    const imgSrc = document.getElementById('profile-preview').src;
    
    if(!nickname) return showError("닉네임을 입력해주세요.");

    try {
        await setDoc(doc(db, "users", currentUser.uid), {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: nickname,
            photoURL: imgSrc
        }, { merge: true });
        
        closeModal('profile-modal');
        updateDashboardProfile({ displayName: nickname, photoURL: imgSrc });
        showSuccess("프로필이 저장되었습니다!");
    } catch(e) {
        console.error(e);
        showError("저장 실패: " + e.message);
    }
}

function handleProfileImagePreview(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('profile-preview').src = e.target.result;
        }
        reader.readAsDataURL(file);
    }
}

function updateDashboardProfile(data) {
    const container = document.getElementById('dashboard-profile-area');
    if (!container) return;

    const fallbackImg = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjYyI+PHBhdGggZD0iTTEyIDEyYzIuMjEgMCA0LTEuNzkgNC00czLtMS43OS00LTQtNC00IDEuNzktNCA0IDEuNzkgNCA0IDR6bTAgMmMtMi42NyAwLTggMS4zNC04IDR2MmgxNnYtMmMwLTIuNjYtNS4zMy00LTgtNHoiLz48L3N2Zz4=';
    const imgSrc = data.photoURL || fallbackImg;

    // ✨ 변경된 부분: 
    // 1. <div>로 감싸서 cursor:pointer (손가락 모양) 추가
    // 2. onclick="openProfileEdit()" 추가 -> 이걸 눌러야 수정창이 뜹니다.
    container.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px; cursor:pointer;" onclick="openProfileEdit()">
            <img src="${imgSrc}" class="user-avatar-small" onerror="this.src='${fallbackImg}'">
            <span class="user-name">${data.displayName}님</span>
        </div>
        <button id="logout-btn-dash" class="btn-icon" style="margin-left:10px;"><i class="fas fa-sign-out-alt"></i></button>
    `;
    
    const logoutBtn = document.getElementById('logout-btn-dash');
    if(logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    const originalLogout = document.getElementById('logout-btn');
    if(originalLogout) originalLogout.style.display = 'none';
}

async function joinTrip(tripId) {
    const tripRef = doc(db, "trips", tripId);
    try {
        await updateDoc(tripRef, { members: arrayUnion(currentUser.email) });
        loadTrip(tripId);
        showSuccess("여행에 참여했습니다!");
    } catch(e) {
        showError("여행 참여 실패 (존재하지 않거나 권한 없음)");
    }
}

function loadUserTrips() {
    const q = query(collection(db, "trips"), where("members", "array-contains", currentUser.email));
    onSnapshot(q, (snapshot) => {
        const listEl = document.getElementById('trip-list');
        if (!listEl) return;
        
        listEl.innerHTML = '';
        if(snapshot.empty) { 
            listEl.innerHTML = '<div style="text-align:center; padding:40px; color:#adb5bd;">아직 여행이 없습니다.<br>새로운 여행을 만들어보세요!</div>'; 
            return; 
        }
        snapshot.forEach(docSnap => {
            const trip = docSnap.data();
            const div = document.createElement('div');
            div.className = 'trip-card';
            div.innerHTML = `
                <div class="trip-info">
                    <h3>${trip.title}</h3>
                    <p style="color:#868e96; margin-top:5px;">${trip.destination} | ${trip.startDate}</p>
                </div>
                <div class="trip-actions">
                    <button class="btn-setting" onclick="window.openTripSettings('${docSnap.id}')"><i class="fas fa-cog"></i></button>
                    <button class="btn-primary" onclick="window.loadTrip('${docSnap.id}')">입장</button>
                </div>
            `;
            listEl.appendChild(div);
        });
    });
}

async function createNewTrip(e) {
    e.preventDefault();
    const title = document.getElementById('trip-title-input').value;
    
    if (tempDestinations.length === 0) {
        return showError("최소 한 곳 이상의 여행지를 추가해주세요.");
    }
    const dest = tempDestinations.join(' / ');

    const start = document.getElementById('start-date').value;
    const end = document.getElementById('end-date').value;
    const sDate = new Date(start); const eDate = new Date(end);
    const daysCount = (eDate - sDate) / (1000 * 60 * 60 * 24) + 1;
    const days = Array.from({length: daysCount}, (_, i) => ({ day: i + 1, places: [] }));

    const newTrip = {
        title, destination: dest, startDate: start, endDate: end,
        owner: currentUser.email, members: [currentUser.email], days: days
    };

    try {
        const docRef = await addDoc(collection(db, "trips"), newTrip);
        closeModal('setup-modal');
        window.loadTrip(docRef.id);
    } catch(e) { showError("생성 실패: " + e.message); }
}

window.openTripSettings = async function(tripId) {
    currentTripId = tripId;
    const docRef = doc(db, "trips", tripId);
    const snap = await getDoc(docRef);
    if(snap.exists()){
        const data = snap.data();
        document.getElementById('setting-trip-id').value = tripId;
        document.getElementById('setting-title').value = data.title;
        document.getElementById('setting-start-date').value = data.startDate;
        document.getElementById('setting-end-date').value = data.endDate;
        openModal('trip-settings-modal');
    }
}

async function updateTripSettings(e) {
    e.preventDefault();
    const tripId = document.getElementById('setting-trip-id').value;
    const title = document.getElementById('setting-title').value;
    const start = document.getElementById('setting-start-date').value;
    const end = document.getElementById('setting-end-date').value;
    
    const tripRef = doc(db, "trips", tripId);
    const snap = await getDoc(tripRef);
    let days = snap.data().days;
    
    const sDate = new Date(start); 
    const eDate = new Date(end);
    const newCount = (eDate - sDate) / (1000 * 60 * 60 * 24) + 1;
    
    if(newCount > days.length) {
        for(let i=days.length; i<newCount; i++) days.push({day: i+1, places: []});
    } else if(newCount < days.length) {
        days = days.slice(0, newCount);
    }

    try {
        await updateDoc(tripRef, { title, startDate: start, endDate: end, days });
        closeModal('trip-settings-modal');
        showSuccess("여행 정보가 수정되었습니다.");
    } catch(e) { showError("수정 실패"); }
}

async function deleteTrip() {
    const tripId = document.getElementById('setting-trip-id').value;
    showConfirm("정말 이 여행을 삭제하시겠습니까? (복구 불가)", async () => {
        try {
            await deleteDoc(doc(db, "trips", tripId));
            closeModal('trip-settings-modal');
            showSuccess("삭제되었습니다.");
        } catch(e) { showError("삭제 실패"); }
    });
}

window.loadTrip = function(tripId) {
    currentTripId = tripId;
    showScreen('planner-screen');
    
    const inviteUrl = `${window.location.origin}${window.location.pathname}?invite=${tripId}`;
    const inviteInput = document.getElementById('invite-link');
    if(inviteInput) inviteInput.value = inviteUrl;

    // async 키워드 추가됨
    onSnapshot(doc(db, "trips", tripId), async (docSnap) => {
        if (!docSnap.exists()) { showScreen('dashboard-screen'); return; }
        currentTripData = docSnap.data();
        
        // 프로필 정보 가져오기 (닉네임 표시용)
        await fetchMemberProfiles();

        const titleEl = document.getElementById('planner-title');
        if(titleEl) titleEl.innerText = currentTripData.title;
        
        renderDayTabs();
        
        // 현재 보고 있는 탭이 있다면 정보 갱신 (닉네임 반영을 위해)
        const activeTab = document.querySelector('.tab-content.active');
        if (activeTab) {
            if (activeTab.id === 'tab-budget') renderBudget();
            if (activeTab.id === 'tab-social') renderMembers();
        }
        
        if(currentDayIndex >= currentTripData.days.length) currentDayIndex = 0;
        selectDay(currentDayIndex);
    });

    if(map && currentTripData) {
        // 데이터에 목적지가 있다면 지도의 중심으로 잡기
        const firstDest = currentTripData.destination ? currentTripData.destination.split(' / ')[0] : "Japan";
        new google.maps.Geocoder().geocode({address: firstDest}, (res, status)=>{
            if(status === 'OK') {
                const loc = res[0].geometry.location;
                map.setCenter(loc);
                fetchWeather(loc.lat(), loc.lng(), firstDest);
            }
        });
    }
}
async function saveTrip() {
    if(!currentTripId) return;
    try { 
        await updateDoc(doc(db, "trips", currentTripId), {
            days: currentTripData.days,
            checklists: currentTripData.checklists || [],
            updatedAt: new Date().toISOString()
        }); 
    } catch(e) { console.error(e); }
}

async function initMapLibrary() {
    try {
        const { Map } = await google.maps.importLibrary("maps");
        const { DirectionsService } = await google.maps.importLibrary("routes");
        const placesLib = await google.maps.importLibrary("places");
        const markerLib = await google.maps.importLibrary("marker");
        const geometryLib = await google.maps.importLibrary("geometry");

        Place = placesLib.Place;
        AdvancedMarkerElement = markerLib.AdvancedMarkerElement;
        PinElement = markerLib.PinElement;
        Geometry = geometryLib;
        directionsService = new DirectionsService();

        const mapEl = document.getElementById('map');
        if(mapEl) {
            map = new Map(mapEl, {
                center: { lat: 35.6762, lng: 139.6503 },
                zoom: 12,
                mapId: "DEMO_MAP_ID",
                disableDefaultUI: true,
                gestureHandling: "greedy"
            });
        }
    } catch (e) {
        console.error("지도 로드 실패:", e);
    }
}

function renderMap() {
    if(!map || !currentTripData) return;
    
    mapMarkers.forEach(m => m.map = null); mapMarkers = [];
    mapPolylines.forEach(p => p.setMap(null)); mapPolylines = [];
    mapRouteMarkers.forEach(m => m.map = null); mapRouteMarkers = [];

    const places = currentTripData.days[currentDayIndex].places;
    if(places.length === 0) return;

    const bounds = new google.maps.LatLngBounds();

    places.forEach((place, idx) => {
        const pinColor = place.type === 'restaurant' ? '#ff6b6b' : '#4dabf7';
        const pin = new PinElement({ 
            background: pinColor, borderColor: "white", 
            glyphText: String(idx + 1), glyphColor: "white" 
        });
        
        const marker = new AdvancedMarkerElement({
            map, position: place.location, content: pin.element, title: place.name
        });
        mapMarkers.push(marker);
        bounds.extend(place.location);
    });

    map.fitBounds(bounds);

    if(places.length > 1) {
        for(let i=0; i<places.length-1; i++) {
            drawRouteAndInfoButton(places[i], places[i+1]);
        }
    }
}

function getSafeTransitDate(timeStr) {
    const now = new Date();
    const targetDate = new Date();

    if(timeStr) { 
        const [h, m] = timeStr.split(':'); 
        targetDate.setHours(h, m, 0, 0); 
    } else { 
        targetDate.setHours(10, 0, 0, 0); 
    }

    if (targetDate < now) {
        targetDate.setDate(targetDate.getDate() + 1);
    }
    return targetDate;
}

function drawRouteAndInfoButton(origin, destination) {
    const targetDate = getSafeTransitDate(origin.time);

    const requestTransit = {
        origin: origin.location,
        destination: destination.location,
        travelMode: google.maps.TravelMode.TRANSIT,
        transitOptions: { departureTime: targetDate }
    };

    directionsService.route(requestTransit, (result, status) => {
        if (status === 'OK') {
            renderPolyline(result.routes[0].overview_path, origin, destination);
        } else {
            const requestDriving = {
                origin: origin.location,
                destination: destination.location,
                travelMode: google.maps.TravelMode.DRIVING
            };
            directionsService.route(requestDriving, (resDriving, statusDriving) => {
                if (statusDriving === 'OK') {
                    renderPolyline(resDriving.routes[0].overview_path, origin, destination);
                } else {
                    const path = [origin.location, destination.location];
                    const polyline = new google.maps.Polyline({
                        path: path, map: map, 
                        strokeColor: '#364fc7', strokeWeight: 6, strokeOpacity: 1.0, 
                        geodesic: true, 
                        icons: [{ icon: {path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW}, offset: '50%' }]
                    });
                    mapPolylines.push(polyline);
                    
                    const midPoint = google.maps.geometry.spherical.interpolate(
                        new google.maps.LatLng(origin.location), 
                        new google.maps.LatLng(destination.location), 0.5
                    );
                    createRouteButton(midPoint, origin, destination);
                }
            });
        }
    });
}

function renderPolyline(path, origin, destination) {
    const polyline = new google.maps.Polyline({
        path: path, map: map, 
        strokeColor: '#364fc7',
        strokeWeight: 7, 
        strokeOpacity: 1.0
    });
    mapPolylines.push(polyline);
    createRouteButton(getPolylineMidpoint(path), origin, destination);
}

function getPolylineMidpoint(path) {
    if (!Geometry || !path || path.length === 0) return null;
    const totalDist = google.maps.geometry.spherical.computeLength(path);
    const halfDist = totalDist / 2;
    let distSoFar = 0;
    for (let i = 0; i < path.length - 1; i++) {
        const segmentDist = google.maps.geometry.spherical.computeDistanceBetween(path[i], path[i+1]);
        if (distSoFar + segmentDist >= halfDist) {
            const ratio = (halfDist - distSoFar) / segmentDist;
            return google.maps.geometry.spherical.interpolate(path[i], path[i+1], ratio);
        }
        distSoFar += segmentDist;
    }
    return path[Math.floor(path.length / 2)];
}

//function createRouteButton(position, origin, destination) {
//    if(!position) return;
//    const btnDiv = document.createElement('div');
//    btnDiv.className = 'route-info-marker';
//    btnDiv.innerHTML = `INFO <i class="fas fa-info-circle"></i>`;
//    btnDiv.addEventListener('click', (e) => { 
//        e.stopPropagation(); 
//        showRouteDetailModal(origin, destination); 
//    });
//    const infoMarker = new AdvancedMarkerElement({
//        map, position: position, content: btnDiv, title: "정보 확인"
//    });
//    mapRouteMarkers.push(infoMarker);
//}
//

function showRouteDetailModal(origin, dest) {
    const container = document.getElementById('route-comparison');
    if(container) container.innerHTML = '<p style="text-align:center;">경로 정보 로딩 중...</p>';
    openModal('route-detail-modal');

    const targetDate = getSafeTransitDate(origin.time);

    directionsService.route({
        origin: origin.location, destination: dest.location, 
        travelMode: google.maps.TravelMode.TRANSIT, 
        transitOptions: { departureTime: targetDate }
    }, (res, status) => {
        if(container) {
            container.innerHTML = '';
            if (status === 'OK') {
                const leg = res.routes[0].legs[0];
                container.innerHTML = `
                    <div class="transport-card">
                        <div class="transport-header">
                            <span>🚍 대중교통 추천</span>
                            <span>${leg.duration.text}</span>
                        </div>
                        <div class="transport-steps">
                            ${formatTransitSteps(leg.steps)}
                        </div>
                    </div>
                `;
                container.appendChild(document.createElement('div')).appendChild(addOtherModes(origin, dest, container));
            } else {
                container.innerHTML = '<p style="text-align:center; padding:20px; color:#868e96;">이 구간은 대중교통 정보가 없거나(일본 등), 도보가 빠릅니다.<br>아래 대체 경로를 참고하세요.</p>';
                container.appendChild(document.createElement('div')).appendChild(addOtherModes(origin, dest, container));
            }
        }
    });
}

function formatTransitSteps(steps) {
    let html = '';
    steps.forEach(step => {
        if (step.travel_mode === 'TRANSIT') {
            const line = step.transit.line;
            const color = line.color || '#339af0';
            const textColor = line.text_color || '#fff';
            html += `
                <div class="transit-step" style="display:flex; gap:10px; margin-bottom:10px;">
                    <span style="background:${color}; color:${textColor}; padding:2px 6px; border-radius:4px; font-weight:bold; height:fit-content; white-space:nowrap;">
                        ${line.vehicle.name||''} ${line.short_name||line.name}
                    </span>
                    <div>
                        <div style="font-weight:bold;">${step.transit.departure_stop.name} 승차</div>
                        <div style="font-size:0.85em; color:#868e96;">⬇ ${step.duration.text} (${step.transit.num_stops}개 역)</div>
                        <div style="font-weight:bold;">${step.transit.arrival_stop.name} 하차</div>
                    </div>
                </div>`;
        } else if (step.travel_mode === 'WALKING') {
            html += `<div style="color:#868e96; font-size:0.9em; margin-bottom:10px;"><i class="fas fa-walking"></i> 도보 ${step.duration.text} (${step.distance.text})</div>`;
        }
    });
    return html;
}

function addOtherModes(origin, dest, container) {
    const wrapper = document.createElement('div');
    const modes = [
        { mode: google.maps.TravelMode.DRIVING, label: "🚖 택시 (예상)", icon: "fa-taxi" },
        { mode: google.maps.TravelMode.WALKING, label: "🚶 도보", icon: "fa-walking" }
    ];
    modes.forEach(m => {
        directionsService.route({ origin: origin.location, destination: dest.location, travelMode: m.mode }, (res, status) => {
            if (status === 'OK') {
                const leg = res.routes[0].legs[0];
                let costStr = "";
                if (m.mode === google.maps.TravelMode.DRIVING) {
                    const km = leg.distance.value / 1000;
                    costStr = `(약 ${Math.round(500 + km*400).toLocaleString()}엔)`;
                }
                const div = document.createElement('div');
                div.className = "transport-option";
                div.style.cssText = "display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;";
                div.innerHTML = `<div><i class="fas ${m.icon}"></i> ${m.label} <small style="color:#fa5252">${costStr}</small></div><div>${leg.duration.text}</div>`;
                wrapper.appendChild(div);
            }
        });
    });
    return wrapper;
}

function renderPlaceList() {
    const list = document.getElementById('places-list');
    if(!list) return;
    list.innerHTML = '';
    
    const places = currentTripData.days[currentDayIndex].places;

    places.forEach((place, idx) => {
        const div = document.createElement('div');
        div.className = 'place-card';
        div.setAttribute('data-id', place.id);
        
        div.onclick = (e) => {
            // 버튼들을 눌렀을 때는 지도 이동 안 함
            if(e.target.closest('button')) return;
            map.panTo(place.location); map.setZoom(15); 
            fetchWeather(place.location.lat, place.location.lng, place.name);
        };

        // 메모가 있을 때만 meta 영역 표시 (비용은 이제 체크 안 함)
        const hasMeta = !!place.memo;
        
        div.innerHTML = `
            <div class="place-marker-icon ${place.type}">${idx+1}</div>
            <div class="place-content">
                <div class="place-header">
                    <span class="place-title">${place.name}</span>
                    <div class="place-right-group">
                        <span class="place-time-badge">${place.time||'--:--'}</span>
                        <div class="place-actions">
                            <button class="btn-action-large" onclick="openEditPlaceModal(${place.id})"><i class="fas fa-edit"></i></button>
                            <button class="btn-action-large delete" style="color:#fa5252;" onclick="removePlace(${place.id})"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                </div>

                <div class="place-meta ${hasMeta?'has-content':''}">
                    ${place.memo ? `<i class="far fa-sticky-note"></i> ${place.memo}` : ''} 
                </div>

                <div class="place-footer-actions">
                    <button class="btn-find-way" onclick="openNavToPlace(${place.location.lat}, ${place.location.lng})">
                        <i class="fas fa-location-arrow"></i> 길찾기
                    </button>
                </div>
            </div>`;
        list.appendChild(div);
    });

    if (sortableInstance) sortableInstance.destroy();
    sortableInstance = new Sortable(list, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: function (evt) {
            // 정렬 로직은 기존과 동일하게 유지
             const itemEl = evt.item; 
             const oldIdx = evt.oldIndex;
             const newIdx = evt.newIndex;
             if (oldIdx === newIdx) return;

             const placesArr = currentTripData.days[currentDayIndex].places;
             const movedItem = placesArr.splice(oldIdx, 1)[0];
             placesArr.splice(newIdx, 0, movedItem);
             
             saveTrip();
             // (필요 시 재렌더링) renderPlaceList();
        },
    });
}

function renderTripInsights() {
    const dayTabs = document.getElementById('day-tabs');
    const placesList = document.getElementById('places-list');
    if (!dayTabs || !placesList || !currentTripData?.days?.[currentDayIndex]) return;

    let panel = document.getElementById('trip-insight-panel');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'trip-insight-panel';
        panel.className = 'trip-insight-panel';
        placesList.parentNode.insertBefore(panel, placesList);
    }

    const places = currentTripData.days[currentDayIndex].places || [];
    const insight = analyzeCurrentDay(places);
    panel.innerHTML = `
        <div class="insight-head">
            <div>
                <span class="insight-kicker">Day ${currentDayIndex + 1} 플래너</span>
                <h3>${insight.title}</h3>
            </div>
            <span class="insight-score ${insight.tone}">${insight.score}</span>
        </div>
        <div class="insight-metrics">
            <div><b>${places.length}</b><span>장소</span></div>
            <div><b>${insight.routeText}</b><span>예상 동선</span></div>
            <div><b>${insight.mealText}</b><span>식사 균형</span></div>
        </div>
        <p>${insight.message}</p>
        <div class="insight-actions">
            <button class="btn-primary" onclick="generateSmartDraft()"><i class="fas fa-wand-magic-sparkles"></i> AI 초안</button>
            <button class="btn-secondary" onclick="fillMealGap()"><i class="fas fa-utensils"></i> 식사 보강</button>
        </div>
    `;
}

function analyzeCurrentDay(places) {
    if (!places.length) {
        return {
            title: '아직 비어 있는 하루',
            score: '초안 필요',
            tone: 'muted',
            routeText: '-',
            mealText: '비어 있음',
            message: 'AI 초안으로 대표 명소, 점심, 카페, 저녁을 먼저 깔아두고 원하는 장소로 바꿔보세요.'
        };
    }

    const totalMeters = estimateRouteMeters(places);
    const hasLunch = places.some(p => isBetweenTime(p.time, 11, 14) && p.type === 'restaurant');
    const hasDinner = places.some(p => isBetweenTime(p.time, 17, 21) && p.type === 'restaurant');
    const mealText = hasLunch && hasDinner ? '좋음' : hasLunch || hasDinner ? '보통' : '부족';
    const routeText = totalMeters ? `${(totalMeters / 1000).toFixed(1)}km` : '-';

    if (places.length >= 6 || totalMeters > 18000) {
        return {
            title: '조금 빡빡한 일정',
            score: '강행군',
            tone: 'warn',
            routeText,
            mealText,
            message: '장소 수나 이동 거리가 많아요. 동선 정렬을 한 번 돌리고, 멀리 떨어진 장소는 다른 날로 빼는 편이 좋겠습니다.'
        };
    }
    if (!hasLunch || !hasDinner) {
        return {
            title: '식사 시간이 비어 있어요',
            score: '보강 추천',
            tone: 'info',
            routeText,
            mealText,
            message: '여행 중 체력은 밥이 절반이에요. 식사 보강 버튼으로 현재 지도 근처 맛집을 바로 찾아볼 수 있습니다.'
        };
    }
    return {
        title: '균형 잡힌 하루',
        score: '좋음',
        tone: 'good',
        routeText,
        mealText,
        message: '장소 수와 식사 구성이 적당합니다. 이동 시간이 길게 느껴지면 동선 정렬만 한 번 확인해 보세요.'
    };
}

function estimateRouteMeters(places) {
    if (!places || places.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < places.length - 1; i++) {
        const from = places[i].location;
        const to = places[i + 1].location;
        if (window.google?.maps?.geometry?.spherical) {
            total += window.google.maps.geometry.spherical.computeDistanceBetween(
                new window.google.maps.LatLng(from),
                new window.google.maps.LatLng(to)
            );
        } else {
            total += haversineMeters(from, to);
        }
    }
    return total;
}

function haversineMeters(from, to) {
    const earth = 6371000;
    const toRad = (deg) => deg * Math.PI / 180;
    const dLat = toRad(to.lat - from.lat);
    const dLng = toRad(to.lng - from.lng);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;
    return earth * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isBetweenTime(time, startHour, endHour) {
    if (!time) return false;
    const hour = Number(time.split(':')[0]);
    return hour >= startHour && hour <= endHour;
}

async function buildSmartDraft() {
    if (!Place || !map) {
        showError('지도가 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.');
        return;
    }

    const destination = getPrimaryDestination();
    const slots = [
        { time: '09:30', query: `${destination} 대표 명소`, type: 'attraction', memo: 'AI 초안: 오전 핵심 명소' },
        { time: '12:30', query: `${destination} 맛집`, type: 'restaurant', memo: 'AI 초안: 점심 후보' },
        { time: '15:30', query: `${destination} 카페`, type: 'attraction', memo: 'AI 초안: 쉬어가는 시간' },
        { time: '18:30', query: `${destination} 저녁 맛집`, type: 'restaurant', memo: 'AI 초안: 저녁 후보' }
    ];

    const existingNames = new Set(currentTripData.days[currentDayIndex].places.map(p => p.name));
    const draftPlaces = [];

    for (const slot of slots) {
        try {
            const { places } = await Place.searchByText({
                textQuery: slot.query,
                fields: ['displayName', 'formattedAddress', 'location', 'types', 'rating'],
                locationBias: map.getCenter()
            });
            const picked = (places || []).find(p => !existingNames.has(p.displayName));
            if (!picked?.location) continue;
            existingNames.add(picked.displayName);
            draftPlaces.push({
                id: Date.now() + draftPlaces.length,
                name: picked.displayName,
                address: picked.formattedAddress || '',
                location: { lat: picked.location.lat(), lng: picked.location.lng() },
                type: slot.type,
                time: slot.time,
                memo: slot.memo,
                cost: 0
            });
        } catch (e) {
            console.warn('Draft search failed:', slot.query, e);
        }
    }

    if (!draftPlaces.length) {
        showError('초안으로 넣을 장소를 찾지 못했습니다. 지도 위치를 여행지 근처로 옮긴 뒤 다시 시도해 주세요.');
        return;
    }

    currentTripData.days[currentDayIndex].places.push(...draftPlaces);
    currentTripData.days[currentDayIndex].places.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    await saveTrip();
    renderTripInsights();
    renderPlaceList();
    renderMap();
    showSuccess(`${draftPlaces.length}개의 일정 초안을 추가했습니다.`);
}

window.generateSmartDraft = function() {
    const places = currentTripData.days[currentDayIndex].places || [];
    if (places.length > 0) {
        showConfirm('현재 일정 뒤에 AI 초안을 추가할까요?', buildSmartDraft);
    } else {
        buildSmartDraft();
    }
};

window.fillMealGap = async function() {
    if (!Place || !map) return showError('지도가 아직 준비되지 않았습니다.');
    const places = currentTripData.days[currentDayIndex].places || [];
    const needLunch = !places.some(p => isBetweenTime(p.time, 11, 14) && p.type === 'restaurant');
    const targetTime = needLunch ? '12:30' : '18:30';
    const destination = getPrimaryDestination();

    try {
        const { places: results } = await Place.searchByText({
            textQuery: `${destination} ${needLunch ? '점심 맛집' : '저녁 맛집'}`,
            fields: ['displayName', 'formattedAddress', 'location', 'types', 'rating'],
            locationBias: map.getCenter()
        });
        const picked = (results || []).find(p => p?.location);
        if (!picked) return showError('추천할 식당을 찾지 못했습니다.');

        currentTripData.days[currentDayIndex].places.push({
            id: Date.now(),
            name: picked.displayName,
            address: picked.formattedAddress || '',
            location: { lat: picked.location.lat(), lng: picked.location.lng() },
            type: 'restaurant',
            time: targetTime,
            memo: `AI 초안: ${needLunch ? '점심' : '저녁'} 후보`,
            cost: 0
        });
        currentTripData.days[currentDayIndex].places.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
        await saveTrip();
        renderTripInsights();
        renderPlaceList();
        renderMap();
        showSuccess(`${needLunch ? '점심' : '저녁'} 후보를 추가했습니다.`);
    } catch (e) {
        showError('식사 후보 검색 실패: ' + e.message);
    }
};

function getPrimaryDestination() {
    return (currentTripData?.destination || '여행지')
        .split(' / ')[0]
        .replace(/\([^)]*\)/g, '')
        .trim();
}

let searchTimer;
function handlePlaceSearch(e) {
    clearTimeout(searchTimer);
    const query = e.target.value;
    if(query.length < 2) {
        document.getElementById('search-results').classList.remove('active');
        document.getElementById('search-results-header').style.display = 'none';
        return;
    }
    searchTimer = setTimeout(async () => {
        if(!Place) return;
        const { places } = await Place.searchByText({ textQuery: query, fields: ['displayName', 'formattedAddress', 'location', 'types'], locationBias: map.getCenter() });
        const resDiv = document.getElementById('search-results');
        const resList = document.getElementById('search-results-list');
        const resHeader = document.getElementById('search-results-header');
        
        resList.innerHTML = '';
        resDiv.classList.add('active');
        
        if(places && places.length > 0) {
            resHeader.style.display = 'flex';
            places.slice(0, 5).forEach(p => {
                const div = document.createElement('div');
                div.className = 'result-item';
                div.innerHTML = `<b>${p.displayName}</b><br><small>${p.formattedAddress}</small>`;
                div.onclick = () => { initiateAddPlace({ displayName: p.displayName, formattedAddress: p.formattedAddress, location: p.location, types: p.types }); };
                resList.appendChild(div);
            });
        } else {
            resHeader.style.display = 'none';
        }
    }, 100);
}

function initiateAddPlace(p) { 
    tempPlaceData = p; 
    document.getElementById('selected-place-name').innerText = p.displayName; 
    document.getElementById('new-place-time').value = "10:00"; 
    openModal('time-selection-modal'); 
    document.getElementById('search-results').classList.remove('active'); 
    document.getElementById('search-results-header').style.display = 'none';
    document.getElementById('place-search').value = ''; 
}

function confirmAddPlace() {
    if (!tempPlaceData) return;
    const timeVal = document.getElementById('new-place-time').value;
    const isFood = (tempPlaceData.types || []).some(t=>['restaurant','food'].includes(t));
    
    const newPlace = { 
        id: Date.now(), 
        name: tempPlaceData.displayName, 
        address: tempPlaceData.formattedAddress, 
        location: { lat: tempPlaceData.location.lat(), lng: tempPlaceData.location.lng() }, 
        type: isFood ? 'restaurant' : 'attraction', 
        time: timeVal, memo: '', cost: 0 
    };
    
    currentTripData.days[currentDayIndex].places.push(newPlace);
    saveTrip(); 
    closeModal('time-selection-modal'); 
    map.panTo(newPlace.location); map.setZoom(15); 
    fetchWeather(newPlace.location.lat, newPlace.location.lng, newPlace.name);
    tempPlaceData = null;
}

function handleMyLocation() {
    if (!navigator.geolocation) {
        showError("브라우저가 위치 정보를 지원하지 않습니다.");
        return;
    }
    showSuccess("내 위치를 찾는 중...");
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
            };
            if (map) {
                map.setCenter(pos);
                map.setZoom(15);
                new google.maps.Marker({
                    position: pos, map: map, title: "내 위치",
                    icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: "#4285F4", fillOpacity: 1, strokeColor: "white", strokeWeight: 2 }
                });
                fetchWeather(pos.lat, pos.lng, "현재 위치");
                showSuccess("현재 위치로 이동했습니다.");
            }
        },
        (error) => { showError("위치 정보를 가져올 수 없습니다."); }
    );
}

async function recommendNearbyPlaces() { 
    if (!map) return; 
    try { 
        const center = map.getCenter(); 
        const request = { 
            fields: ['displayName', 'formattedAddress', 'location', 'types', 'rating'], 
            locationRestriction: { center: { lat: center.lat(), lng: center.lng() }, radius: 2000 }, 
            includedPrimaryTypes: ['tourist_attraction', 'restaurant', 'cafe', 'park', 'museum'], 
            maxResultCount: 10 
        }; 
        
        const { places } = await Place.searchNearby(request); 
        
        const listContainer = document.getElementById('recommendation-list');
        listContainer.innerHTML = ''; 

        if (places && places.length > 0) { 
            places.forEach(p => { 
                const div = document.createElement('div'); 
                div.className = 'rec-item'; 
                const ratingStr = p.rating ? `⭐ ${p.rating}` : '평점 없음'; 
                div.innerHTML = `
                    <div style="font-weight:bold; font-size:1.05em;">${p.displayName}</div>
                    <div style="color:#fcc419; font-size:0.9em; margin:2px 0;">${ratingStr}</div>
                    <div style="color:#868e96; font-size:0.85em;">${p.formattedAddress}</div>
                `;
                div.onclick = () => { 
                    initiateAddPlace({ 
                        displayName: p.displayName, 
                        formattedAddress: p.formattedAddress, 
                        location: p.location, 
                        types: p.types 
                    });
                    closeModal('recommendation-modal'); 
                }; 
                listContainer.appendChild(div); 
            }); 
            openModal('recommendation-modal');
            showSuccess("주변 명소를 찾았습니다!"); 
        } else { 
            showError("추천할 명소가 없습니다."); 
        } 
    } catch (e) { 
        showError("명소 검색 오류: " + e.message); 
    } 
}

window.switchTab = function(tabName) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    const targetBtn = document.querySelector(`.tab-btn[onclick="switchTab('${tabName}')"]`);
    if(targetBtn) targetBtn.classList.add('active');
    
    const targetContent = document.getElementById(`tab-${tabName}`);
    if(targetContent) targetContent.classList.add('active');
    
    if(tabName === 'budget') renderBudget();
    if(tabName === 'social') renderMembers();
    if(tabName === 'checklist') renderChecklists();
};

function renderDayTabs() { 
    const c=document.getElementById('day-tabs'); 
    if(!c) return;
    c.innerHTML=''; 
    currentTripData.days.forEach((d,i)=>{
        const b=document.createElement('button');
        b.className=`day-btn ${i===currentDayIndex?'active':''}`;
        b.innerText=`${d.day}일차`;
        b.onclick=()=>selectDay(i);
        c.appendChild(b);
    });
}
function selectDay(idx) { currentDayIndex = idx; renderDayTabs(); renderTripInsights(); renderPlaceList(); renderMap(); }

async function renderMembers() {
    const list = document.getElementById('member-list');
    if(!list) return;
    list.innerHTML = '';
    const emails = currentTripData.members;
    
    // 현재 로그인한 사람이 방장인지 확인
    const isOwner = currentTripData.owner === currentUser.email;

    try {
        // 프로필 캐시가 없으면 가져오기
        if (Object.keys(memberProfileCache).length === 0) await fetchMemberProfiles();
        
        emails.forEach(email => {
            const user = memberProfileCache[email] || { displayName: email.split('@')[0], photoURL: 'https://via.placeholder.com/50' };
            const isMe = email === currentUser.email;
            
            // 삭제 버튼: 방장이고, 대상이 본인이 아닐 때만 표시
            let deleteBtn = '';
            if (isOwner && !isMe) {
                deleteBtn = `<div class="member-delete-btn" onclick="removeMember('${email}')"><i class="fas fa-times"></i></div>`;
            }

            list.innerHTML += `
                <div class="member-item" style="position:relative;">
                    <div style="position:relative; display:inline-block;">
                        <img src="${user.photoURL}" class="member-avatar">
                        ${deleteBtn}
                    </div>
                    <div class="member-name">${user.displayName}</div>
                </div>`;
        });
    } catch(e) {
        console.error(e);
    }
}

window.openEditPlaceModal = function(id) { 
    currentEditPlaceId = id; 
    const p = currentTripData.days[currentDayIndex].places.find(p => p.id === id); 
    if (!p) return; 

    document.getElementById('edit-place-name').value = p.name; 
    document.getElementById('edit-place-time').value = p.time; 
    document.getElementById('edit-place-memo').value = p.memo || ''; 
    
    // 기존 데이터에 expenseItems가 없으면(옛날 데이터) cost 기반으로 하나 만들어줌
    if (!p.expenseItems || p.expenseItems.length === 0) {
        if (p.cost > 0) {
            tempExpenseBuffer = [{
                id: Date.now(),
                name: "전체 비용",
                price: p.cost,
                members: p.involvedMembers || currentTripData.members // 정보 없으면 전원
            }];
        } else {
            tempExpenseBuffer = [];
        }
    } else {
        // 깊은 복사 (수정하다가 취소할 수도 있으니까)
        tempExpenseBuffer = JSON.parse(JSON.stringify(p.expenseItems));
    }

    renderExpenseBuffer(); // 리스트 그리기
    renderNewItemMemberSelect(); // 멤버 선택 버튼 그리기

    openModal('place-edit-modal'); 
}
function savePlaceDetails() { 
    if (!currentEditPlaceId) return; 
    const p = currentTripData.days[currentDayIndex].places.find(p => p.id === currentEditPlaceId); 
    if (p) { 
        p.name = document.getElementById('edit-place-name').value;
        p.time = document.getElementById('edit-place-time').value; 
        p.memo = document.getElementById('edit-place-memo').value; 
        
        // 상세 내역 저장
        p.expenseItems = tempExpenseBuffer;
        
        // 총 비용 업데이트 (지도나 리스트에 표시용)
        p.cost = tempExpenseBuffer.reduce((sum, item) => sum + item.price, 0);

        saveTrip(); 
        closeModal('place-edit-modal'); 
        renderPlaceList(); // 리스트 갱신
        renderBudget();    // 가계부 갱신
    } 
}

window.removePlace = function(id) { 
    showConfirm("정말 삭제하시겠습니까?", () => {
        currentTripData.days[currentDayIndex].places=currentTripData.days[currentDayIndex].places.filter(p=>p.id!==id); 
        saveTrip(); 
    });
}
function renderBudget() { 
    const l = document.getElementById('budget-list'); 
    if (!l) return;
    
    let totalSpent = 0;
    const memberSpendMap = {}; 

    // 1. 비용 계산 로직 (기존과 동일하지만, 데이터 집계용)
    currentTripData.days.forEach(d => {
        d.places.forEach(p => {
            // 상세 내역(영수증)이 있는 경우
            if (p.expenseItems && p.expenseItems.length > 0) {
                p.expenseItems.forEach(item => {
                    totalSpent += item.price;
                    // 혹시라도 멤버가 0명이면 1로 계산 방지
                    const count = item.members.length > 0 ? item.members.length : 1;
                    const splitPrice = item.price / count;
                    
                    item.members.forEach(email => {
                        memberSpendMap[email] = (memberSpendMap[email] || 0) + splitPrice;
                    });
                });
            } 
            // 상세 내역은 없는데 총액만 있는 경우 (구 데이터 호환용)
            else if (p.cost > 0) {
                totalSpent += p.cost;
                const members = p.involvedMembers || currentTripData.members;
                const count = members.length > 0 ? members.length : 1;
                const splitPrice = p.cost / count;
                
                members.forEach(email => {
                    memberSpendMap[email] = (memberSpendMap[email] || 0) + splitPrice;
                });
            }
        });
    }); 

    // 2. 화면 그리기
    l.innerHTML = '';
    
    // (1) 멤버별 정산 요약 (✨ 닉네임 적용 부분)
    const summaryHeader = document.createElement('h4');
    summaryHeader.innerText = '📊 최종 정산 (개인별 부담금)';
    summaryHeader.style.margin = '20px 0 10px 0';
    l.appendChild(summaryHeader);

    // 많이 낸 사람 순서로 정렬
    const sortedMembers = Object.entries(memberSpendMap).sort((a,b) => b[1] - a[1]);

    for (const [email, cost] of sortedMembers) {
        // ★ 캐시에서 닉네임 가져오기 (없으면 이메일 앞부분)
        const profile = memberProfileCache[email] || { displayName: email.split('@')[0] };
        const name = profile.displayName;

        l.innerHTML += `
            <div class="settlement-card">
                <span style="font-weight:600;"><i class="fas fa-user"></i> ${name}</span>
                <span style="color:#339af0; font-weight:bold;">${Math.round(cost).toLocaleString()}원</span>
            </div>
        `;
    }

    // (2) 상세 지출 리스트
    const detailHeader = document.createElement('h4');
    detailHeader.innerText = '📝 지출 기록';
    detailHeader.style.margin = '30px 0 10px 0';
    l.appendChild(detailHeader);

    currentTripData.days.forEach(d => {
        d.places.forEach(p => {
            // 비용이 있거나 상세 내역이 있는 경우 표시
            let displayCost = p.cost;
            if(p.expenseItems && p.expenseItems.length > 0) {
                displayCost = p.expenseItems.reduce((acc, cur) => acc + cur.price, 0);
            }

            if (displayCost > 0) {
                // 상세 내역 HTML 생성 (여기서도 닉네임 적용)
                let detailsHtml = '';
                if (p.expenseItems && p.expenseItems.length > 0) {
                    detailsHtml = p.expenseItems.map(item => {
                        // 참여 멤버들을 닉네임으로 변환해서 나열
                        const memberNames = item.members.map(m => {
                            const prof = memberProfileCache[m] || { displayName: m.split('@')[0] };
                            return prof.displayName;
                        }).join(', ');

                        return `<div style="font-size:0.85em; color:#868e96; display:flex; justify-content:space-between;">
                            <span>- ${item.name} (${memberNames})</span>
                            <span>${item.price.toLocaleString()}원</span>
                        </div>`;
                    }).join('');
                }

                l.innerHTML += `
                    <div style="padding:12px 0; border-bottom:1px solid #eee;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                            <span style="font-weight:600;">${p.name}</span>
                            <span style="font-weight:700;">${displayCost.toLocaleString()}원</span>
                        </div>
                        ${detailsHtml}
                    </div>`;
            }
        });
    });

    document.getElementById('total-cost').innerText = `${totalSpent.toLocaleString()} 원`; 
}
async function fetchWeather(lat, lon, name) {
    const widget = document.getElementById('weather-widget');
    if(!widget) return;
    if (!CONFIG.OPENWEATHER_API_KEY) return; 
    try { 
        const weatherRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=kr&appid=${CONFIG.OPENWEATHER_API_KEY}`); 
        const wData = await weatherRes.json(); 
        const current = wData.list[0]; 
        const iconUrl = `https://openweathermap.org/img/wn/${current.weather[0].icon}@2x.png`; 
        widget.innerHTML = `<div class="weather-icon"><img src="${iconUrl}" alt="weather" style="width:50px;"></div><div class="weather-info"><div class="weather-main" style="font-weight:bold;">${name}</div><div class="weather-desc" style="font-size:0.9em;">${current.main.temp.toFixed(1)}°C, ${current.weather[0].description}</div></div>`; 
    } catch (e) { console.warn(e); } 
}

function optimizeRoute() {
    const places = currentTripData.days[currentDayIndex].places;
    if (places.length < 3) { showError("장소가 3개 이상일 때 가능합니다."); return; }
    
    showConfirm("거리순으로 정렬하시겠습니까? (현재 순서 무시)", () => {
        const optimized = [places[0]]; let remaining = places.slice(1);
        while (remaining.length > 0) {
            const last = optimized[optimized.length - 1]; let nearestIdx = 0; let minDist = Infinity;
            remaining.forEach((p, idx) => {
                const dist = google.maps.geometry.spherical.computeDistanceBetween(new google.maps.LatLng(last.location), new google.maps.LatLng(p.location));
                if (dist < minDist) { minDist = dist; nearestIdx = idx; }
            });
            optimized.push(remaining[nearestIdx]); remaining.splice(nearestIdx, 1);
        }
        currentTripData.days[currentDayIndex].places = optimized; 
        saveTrip(); 
        showSuccess("재정렬 완료!");
    });
}

window.closeSearchResults = function() {
  const resultsDiv = document.getElementById('search-results');
  const resHeader = document.getElementById('search-results-header');
  if (resultsDiv) {
    resultsDiv.classList.remove('active');
  }
  if (resHeader) {
    resHeader.style.display = 'none';
  }
};

document.addEventListener('click', (e) => {
  const searchBox = document.querySelector('.search-box');
  const resultsDiv = document.getElementById('search-results');
  
  if (searchBox && resultsDiv && !searchBox.contains(e.target)) {
    resultsDiv.classList.remove('active');
    const resHeader = document.getElementById('search-results-header');
    if (resHeader) resHeader.style.display = 'none';
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeSearchResults();
  }
});

function renderChecklists() {
    const container = document.getElementById('checklist-container');
    if (!container) return;
    container.innerHTML = '';
    
    // 데이터가 없으면 초기값 생성
    if (!currentTripData.checklists) {
        currentTripData.checklists = [
            { id: Date.now(), title: "준비물", items: [] },
            { id: Date.now()+1, title: "사고 싶은 것", items: [] }
        ];
    }

    currentTripData.checklists.forEach((list, listIdx) => {
        const div = document.createElement('div');
        div.className = 'checklist-card';
        div.innerHTML = `
            <div class="checklist-header">
                <input type="text" class="checklist-title" value="${list.title}" onchange="updateChecklistTitle(${listIdx}, this.value)">
                <button class="btn-icon" style="color:#fa5252" onclick="deleteChecklist(${listIdx})"><i class="fas fa-trash-alt"></i></button>
            </div>
            <div id="cl-items-${listIdx}"></div>
            <div style="display:flex; gap:5px; margin-top:10px;">
                <input type="text" class="checklist-input" id="cl-input-${listIdx}" placeholder="항목 추가..." onkeypress="if(event.key==='Enter') addChecklistItem(${listIdx})">
                <button class="btn-secondary" onclick="addChecklistItem(${listIdx})"><i class="fas fa-plus"></i></button>
            </div>
        `;
        container.appendChild(div);
        
        const itemContainer = div.querySelector(`#cl-items-${listIdx}`);
        list.items.forEach((item, itemIdx) => {
            itemContainer.innerHTML += `
                <div class="checklist-item ${item.checked ? 'checked' : ''}">
                    <input type="checkbox" class="checklist-checkbox" ${item.checked ? 'checked' : ''} onchange="toggleChecklistItem(${listIdx}, ${itemIdx})">
                    <span style="flex:1;">${item.text}</span>
                    <i class="fas fa-times" style="cursor:pointer; color:#dee2e6;" onclick="deleteChecklistItem(${listIdx}, ${itemIdx})"></i>
                </div>
            `;
        });
    });
}

// 체크리스트 관련 헬퍼 함수들
window.addNewChecklistCategory = function() {
    currentTripData.checklists.push({ id: Date.now(), title: "새 리스트", items: [] });
    saveTrip(); renderChecklists();
};
window.updateChecklistTitle = function(idx, val) { currentTripData.checklists[idx].title = val; saveTrip(); };
window.deleteChecklist = function(idx) { 
    showConfirm("리스트를 삭제할까요?", () => { currentTripData.checklists.splice(idx, 1); saveTrip(); renderChecklists(); }); 
};
window.addChecklistItem = function(listIdx) {
    const input = document.getElementById(`cl-input-${listIdx}`);
    if (!input.value.trim()) return;
    currentTripData.checklists[listIdx].items.push({ text: input.value, checked: false });
    saveTrip(); renderChecklists();
};
window.toggleChecklistItem = function(listIdx, itemIdx) {
    const item = currentTripData.checklists[listIdx].items[itemIdx];
    item.checked = !item.checked;
    saveTrip(); renderChecklists();
};
window.deleteChecklistItem = function(listIdx, itemIdx) {
    currentTripData.checklists[listIdx].items.splice(itemIdx, 1);
    saveTrip(); renderChecklists();
};
function copyInviteLink() { const copyText = document.getElementById("invite-link"); copyText.select(); navigator.clipboard.writeText(copyText.value).then(() => { showSuccess("링크 복사 완료!"); }); }
function redirectToBooking() { const places = currentTripData.days[currentDayIndex].places; if (places.length === 0) return; const lastPlace = places[places.length - 1]; const query = encodeURIComponent(`${currentTripData.destination} ${lastPlace.name} ticket`); window.open(`https://www.google.com/search?q=${query}`, '_blank'); }

function openModal(id) { document.getElementById(id).classList.add('active'); }
window.closeModal = (id) => document.getElementById(id).classList.remove('active');
function showScreen(id) { document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); document.getElementById(id).classList.add('active'); }


function renderNewItemMemberSelect() {
    const container = document.getElementById('new-item-members');
    container.innerHTML = '';
    
    currentTripData.members.forEach(email => {
        // 기존: const name = email.split('@')[0];
        // 변경: 캐시에서 닉네임 가져오기
        const profile = memberProfileCache[email] || { displayName: email.split('@')[0] };
        const name = profile.displayName;
        
        const chip = document.createElement('div');
        chip.className = 'member-select-chip selected'; 
        chip.innerHTML = `${name}`; // 닉네임 표시
        chip.dataset.email = email;
        chip.onclick = () => chip.classList.toggle('selected');
        container.appendChild(chip);
    });
}

// "항목 추가하기" 버튼 눌렀을 때
window.addExpenseItemToBuffer = function() {
    const nameInput = document.getElementById('new-item-name');
    const priceInput = document.getElementById('new-item-price');
    const name = nameInput.value.trim();
    const price = Number(priceInput.value);

    if (!name || price <= 0) return showError("품목명과 가격을 입력하세요.");

    // 선택된 멤버 확인
    const selectedChips = document.querySelectorAll('#new-item-members .member-select-chip.selected');
    if (selectedChips.length === 0) return showError("최소 1명의 멤버를 선택하세요.");
    
    const members = Array.from(selectedChips).map(c => c.dataset.email);

    tempExpenseBuffer.push({
        id: Date.now(),
        name: name,
        price: price,
        members: members
    });

    // 입력창 초기화
    nameInput.value = '';
    priceInput.value = '';
    renderNewItemMemberSelect(); // 멤버 선택 다시 전원 선택으로 리셋
    renderExpenseBuffer();
}

// 리스트 화면에 그리기
function renderExpenseBuffer() {
    const list = document.getElementById('expense-items-list');
    const totalPreview = document.getElementById('edit-total-preview');
    list.innerHTML = '';
    
    let total = 0;

    tempExpenseBuffer.forEach((item, idx) => {
        total += item.price;
        // 멤버 이름들 표시 (예: 이서원, 문승환 외 1명)
        const memberNames = item.members.map(e => e.split('@')[0]).join(', ');
        
        list.innerHTML += `
            <div class="expense-item-row">
                <div>
                    <div class="expense-info"><b>${item.name}</b> : ${item.price.toLocaleString()}원</div>
                    <div class="expense-members"><i class="fas fa-user-friends"></i> ${memberNames}</div>
                </div>
                <button class="btn-icon" style="color:#fa5252" onclick="removeExpenseItemFromBuffer(${idx})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    });
    
    totalPreview.innerText = `${total.toLocaleString()}원`;
}
window.openGoogleMapRoute = function(startLat, startLng, endLat, endLng) {
    // 구글 맵 웹사이트 URL (앱이 있으면 앱으로 연결됨)
    // api=1 : API 모드
    // origin : 출발지 좌표
    // destination : 도착지 좌표
    // travelmode : transit (대중교통 우선)
    const url = `https://www.google.com/maps/dir/?api=1&origin=${startLat},${startLng}&destination=${endLat},${endLng}&travelmode=transit`;
    
    window.open(url, '_blank');
}

window.openNavToPlace = function(lat, lng) {
    // 구글 맵 URL 스킴
    // destination: 목적지 좌표
    // dir_action=navigate: 바로 내비게이션/길찾기 모드 진입
    // (출발지를 입력하지 않으면 자동으로 '현재 위치'가 됩니다)
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=transit`;
    window.open(url, '_blank');
}
window.removeExpenseItemFromBuffer = function(idx) {
    tempExpenseBuffer.splice(idx, 1);
    renderExpenseBuffer();
}
async function fetchMemberProfiles() {
    if (!currentTripData || !currentTripData.members) return;
    
    // 1. 일단 기본값(이메일 앞부분)으로 초기화
    currentTripData.members.forEach(email => {
        if (!memberProfileCache[email]) {
            memberProfileCache[email] = { displayName: email.split('@')[0], photoURL: null };
        }
    });

    try {
        // 2. Firestore에서 실제 유저 정보 가져오기
        const emails = currentTripData.members;
        // Firestore 'in' 쿼리는 최대 10개까지만 가능하므로 쪼개서 요청
        const chunks = [];
        for (let i = 0; i < emails.length; i += 10) {
            chunks.push(emails.slice(i, i + 10));
        }

        for (const chunk of chunks) {
            const q = query(collection(db, "users"), where("email", "in", chunk));
            const snap = await getDocs(q);
            snap.forEach(doc => {
                const data = doc.data();
                memberProfileCache[data.email] = data; // 캐시에 저장
            });
        }
    } catch (e) {
        console.warn("프로필 로드 중 오류(무시 가능):", e);
    }
}

window.removeMember = function(email) {
    if (!confirm(`${email} 님을 여행에서 내보내시겠습니까?`)) return;
    
    const tripRef = doc(db, "trips", currentTripId);
    updateDoc(tripRef, {
        members: arrayRemove(email)
    }).then(() => {
        showSuccess("멤버를 삭제했습니다.");
        // renderMembers는 onSnapshot에 의해 자동 갱신됨
    }).catch((e) => {
        showError("삭제 실패: " + e.message);
    });
}

window.openProfileEdit = function() {
    // 현재 내 정보 가져오기 (캐시 또는 DB)
    const myProfile = memberProfileCache[currentUser.email] || { 
        displayName: currentUser.displayName, 
        photoURL: currentUser.photoURL 
    };

    document.getElementById('profile-nickname').value = myProfile.displayName;
    document.getElementById('profile-preview').src = myProfile.photoURL || 'https://via.placeholder.com/100';
    
    openModal('profile-modal');
}
