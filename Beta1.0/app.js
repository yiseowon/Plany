// app.js - Travel Mate Final Full Version

// ==========================================
// 1. 라이브러리 임포트 (Firebase)
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut, 
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
    arrayUnion 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ==========================================
// 2. 초기화 및 전역 변수
// ==========================================
// CONFIG는 config.js에서 로드됨
const app = initializeApp(CONFIG.FIREBASE);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// 지도 및 서비스 객체
let map;
let directionsService;
let Place, AdvancedMarkerElement, PinElement, Geometry;

// 현재 세션 데이터
let currentUser = null;
let currentTripId = null;
let currentTripData = null;
let currentDayIndex = 0;
let currentEditPlaceId = null; // 수정 중인 장소 ID
let tempPlaceData = null;      // 장소 검색 후 임시 저장 데이터
let sortableInstance = null;   // 드래그 앤 드롭 인스턴스

// 지도 오버레이 배열 (삭제용)
let mapMarkers = [];
let mapPolylines = [];
let mapRouteMarkers = [];

// [DATA] 전 세계 주요 여행지 데이터 (국가 -> 도시)
const LOCATION_DATA = {
    // 아시아
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
    
    // 유럽
    "FR": { name: "프랑스", regions: ["파리", "니스", "리옹", "마르세유", "몽생미셸", "스트라스부르", "콜마르"] },
    "IT": { name: "이탈리아", regions: ["로마", "밀라노", "피렌체", "베네치아", "나폴리", "포지타노", "쏘렌토"] },
    "ES": { name: "스페인", regions: ["바르셀로나", "마드리드", "세비야", "그라나다", "발렌시아", "이비자"] },
    "UK": { name: "영국", regions: ["런던", "에든버러", "맨체스터", "리버풀", "옥스포드", "코츠월드"] },
    "DE": { name: "독일", regions: ["베를린", "뮌헨", "프랑크푸르트", "함부르크", "쾰른", "하이델베르크"] },
    "CH": { name: "스위스", regions: ["인터라켄", "취리히", "제네바", "루체른", "체르마트", "베른"] },
    "CZ": { name: "동유럽", regions: ["프라하(체코)", "부다페스트(헝가리)", "빈(오스트리아)", "잘츠부르크(오스트리아)"] },
    
    // 미주/대양주
    "US": {
        name: "미국",
        regions: ["뉴욕", "LA", "라스베이거스", "하와이", "샌프란시스코", "시애틀", "시카고", "올랜도", "마이애미", "보스턴", "워싱턴DC", "괌", "사이판"]
    },
    "CA": { name: "캐나다", regions: ["토론토", "밴쿠버", "몬트리올", "퀘벡", "나이아가라", "캘거리(밴프)"] },
    "AU": { name: "호주", regions: ["시드니", "멜버른", "골드코스트", "브리즈번", "퍼스", "케언즈"] },
    "NZ": { name: "뉴질랜드", regions: ["오클랜드", "퀸스타운", "크라이스트처치", "로토루아"] }
};

// 선택된 여행지 태그 저장소
let tempDestinations = [];


// ==========================================
// 3. 공용 팝업 시스템 (커스텀 모달)
// ==========================================
function showPopup(title, msg, iconClass, showCancel = false, onConfirm = null) {
    const modal = document.getElementById('common-modal');
    if (!modal) return alert(msg); // HTML 로드 전 비상 대비

    document.getElementById('common-modal-title').innerText = title;
    document.getElementById('common-modal-msg').innerText = msg;
    
    const iconContainer = document.getElementById('common-modal-icon');
    iconContainer.innerHTML = `<i class="${iconClass}"></i>`;
    
    // 아이콘 색상 자동 지정
    if(iconClass.includes('check')) iconContainer.style.color = '#40c057'; // 성공(초록)
    else if(iconClass.includes('exclamation') || iconClass.includes('trash')) iconContainer.style.color = '#fa5252'; // 에러/삭제(빨강)
    else iconContainer.style.color = '#4dabf7'; // 기본(파랑)

    const actions = document.getElementById('common-modal-actions');
    actions.innerHTML = ''; // 버튼 초기화

    // 확인 버튼
    const okBtn = document.createElement('button');
    okBtn.innerText = showCancel ? '네' : '확인';
    okBtn.className = 'btn-primary';
    okBtn.style.minWidth = '80px';
    okBtn.onclick = () => {
        closeModal('common-modal');
        if (onConfirm) onConfirm();
    };
    actions.appendChild(okBtn);

    // 취소 버튼
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

// 팝업 단축 함수들
function showSuccess(msg) { showPopup("성공", msg, "fas fa-check-circle"); }
function showError(msg) { showPopup("오류", msg, "fas fa-exclamation-circle"); }
function showConfirm(msg, callback) { showPopup("확인", msg, "fas fa-question-circle", true, callback); }


// ==========================================
// 4. 초기화 및 이벤트 리스너 연결
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    
    // 안전한 이벤트 연결 헬퍼 (요소가 없으면 에러 없이 넘어감)
    const addListener = (id, event, handler) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, handler);
    };

    // --- 메인 버튼 ---
    addListener('google-login-btn', 'click', handleLogin);
    addListener('logout-btn', 'click', handleLogout); 
    addListener('create-new-trip-btn', 'click', openCreateTripModal); // [수정] 모달 열기 함수 분리
    addListener('trip-form', 'submit', createNewTrip);
    addListener('back-to-dashboard', 'click', () => showScreen('dashboard-screen'));
    
    // --- 플래너 내부 기능 ---
    addListener('place-search', 'input', handlePlaceSearch);
    addListener('optimize-route', 'click', optimizeRoute);
    addListener('copy-link-btn', 'click', copyInviteLink);
    addListener('save-place-btn', 'click', savePlaceDetails);
    addListener('recommend-places', 'click', recommendNearbyPlaces);
    addListener('book-ticket-btn', 'click', redirectToBooking);
    
    // 시간 선택 모달 확인 버튼
    addListener('confirm-add-place-btn', 'click', confirmAddPlace);
    
    // --- 프로필 관련 ---
    addListener('save-profile-btn', 'click', saveUserProfile);
    addListener('profile-file-input', 'change', handleProfileImagePreview);
    
    // --- GPS 내 위치 ---
    addListener('my-location-btn', 'click', handleMyLocation);

    // --- 여행 설정 및 삭제 ---
    addListener('trip-settings-form', 'submit', updateTripSettings);
    addListener('btn-delete-trip', 'click', deleteTrip);

    // --- 여행지 선택 로직 초기화 ---
    initLocationSelectors();

    // --- 초대 링크 처리 ---
    const urlParams = new URLSearchParams(window.location.search);
    const inviteTripId = urlParams.get('invite');

    // --- 인증 상태 감지 (앱 진입점) ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            await checkUserProfile(user); // 프로필 체크

            if (inviteTripId) {
                // 초대 링크로 들어온 경우 자동 참여
                await joinTrip(inviteTripId);
                // URL 파라미터 청소
                window.history.replaceState({}, document.title, window.location.pathname);
            } else {
                showScreen('dashboard-screen');
            }
            
            loadUserTrips(); // 목록 로드
            if(!map) initMapLibrary(); // 지도 라이브러리 미리 로드
        } else {
            currentUser = null;
            showScreen('login-screen');
        }
    });
});

// ==========================================
// 5. 여행지 선택 로직 (국가 -> 도시)
// ==========================================
function initLocationSelectors() {
    const countrySelect = document.getElementById('select-country');
    const regionSelect = document.getElementById('select-region');
    const addBtn = document.getElementById('btn-add-region');

    if(!countrySelect) return;

    // 국가 옵션 채우기
    for (const [code, data] of Object.entries(LOCATION_DATA)) {
        const opt = document.createElement('option');
        opt.value = code;
        opt.innerText = data.name;
        countrySelect.appendChild(opt);
    }

    // 국가 변경 시 지역 옵션 갱신
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

    // 추가 버튼 클릭 시 태그 생성
    addBtn.addEventListener('click', () => {
        const countryCode = countrySelect.value;
        const region = regionSelect.value;
        
        if (!countryCode || !region) return; 

        // 중복 및 태그 생성
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

// 태그 삭제 (전역 할당)
window.removeDestinationTag = function(index) {
    tempDestinations.splice(index, 1);
    renderDestinationTags();
};

function openCreateTripModal() {
    // 모달 초기화
    tempDestinations = [];
    renderDestinationTags();
    document.getElementById('trip-form').reset();
    document.getElementById('select-region').innerHTML = '<option value="">지역 선택</option>';
    document.getElementById('select-region').disabled = true;
    openModal('setup-modal');
}

// ==========================================
// 6. 인증 및 프로필
// ==========================================
async function handleLogin() { 
    try { await signInWithPopup(auth, provider); } 
    catch(e) { showError("로그인 실패: " + e.message); } 
}

function handleLogout() { 
    showConfirm("정말 로그아웃 하시겠습니까?", () => { 
        signOut(auth); 
        window.location.reload(); 
    }); 
}

// 프로필 확인 및 생성 모달
async function checkUserProfile(user) {
    const userRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userRef);

    if (!docSnap.exists()) {
        const nickInput = document.getElementById('profile-nickname');
        const prevImg = document.getElementById('profile-preview');
        // 기본 이미지 (Base64)
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

    const fallbackImg = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjYyI+PHBhdGggZD0iTTEyIDEyYzIuMjEgMCA0LTEuNzkgNC00czLTEuNzktNC00LTQtNCAxLjc5LTQgNCAxLjc5IDQgNCA0em0wIDJjLTIuNjcgMC04IDEuMzQtOCA0djJoMTZ2LTJjMC0yLjY2LTUuMzMtNC04LTR6Ii8+PC9zdmc+';
    const imgSrc = data.photoURL || fallbackImg;

    container.innerHTML = `
        <img src="${imgSrc}" class="user-avatar-small" onerror="this.src='${fallbackImg}'">
        <span class="user-name">${data.displayName}님</span>
        <button id="logout-btn-dash" class="btn-icon"><i class="fas fa-sign-out-alt"></i></button>
    `;
    
    const logoutBtn = document.getElementById('logout-btn-dash');
    if(logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    const originalLogout = document.getElementById('logout-btn');
    if(originalLogout) originalLogout.style.display = 'none';
}

// ==========================================
// 7. 여행 데이터 관리 (CRUD)
// ==========================================
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

// 새 여행 생성
async function createNewTrip(e) {
    e.preventDefault();
    const title = document.getElementById('trip-title-input').value;
    
    // 태그 확인
    if (tempDestinations.length === 0) {
        return showError("최소 한 곳 이상의 여행지를 추가해주세요.");
    }
    const dest = tempDestinations.join(' / '); // DB 저장용 문자열

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

// 여행 설정 열기
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

// 여행 정보 수정
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

// 여행 삭제
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

// 여행 불러오기
window.loadTrip = function(tripId) {
    currentTripId = tripId;
    showScreen('planner-screen');
    
    const inviteUrl = `${window.location.origin}${window.location.pathname}?invite=${tripId}`;
    const inviteInput = document.getElementById('invite-link');
    if(inviteInput) inviteInput.value = inviteUrl;

    onSnapshot(doc(db, "trips", tripId), (docSnap) => {
        if (!docSnap.exists()) { showScreen('dashboard-screen'); return; }
        currentTripData = docSnap.data();
        
        const titleEl = document.getElementById('planner-title');
        if(titleEl) titleEl.innerText = currentTripData.title;
        
        renderDayTabs();
        
        const socialTab = document.getElementById('tab-social');
        if(socialTab && socialTab.classList.contains('active')) {
            renderMembers();
        }
        
        if(currentDayIndex >= currentTripData.days.length) currentDayIndex = 0;
        selectDay(currentDayIndex);
    });

    // 지도 중심: 첫 번째 여행지 기준
    if(map && currentTripData) {
        // "도쿄, 일본 / 오사카, 일본" 형태라면 첫 번째 것만 따옴
        const firstDest = currentTripData.destination.split(' / ')[0];
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
        await updateDoc(doc(db, "trips", currentTripId), { days: currentTripData.days }); 
    } catch(e) { console.error(e); }
}

// ==========================================
// 8. 지도 및 경로 (일본/해외 Transit 해결)
// ==========================================
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

// [핵심] 날짜 안전 장치
function getSafeTransitDate(timeStr) {
    const now = new Date();
    const targetDate = new Date(); // 오늘로 초기화

    if(timeStr) { 
        const [h, m] = timeStr.split(':'); 
        targetDate.setHours(h, m, 0, 0); 
    } else { 
        targetDate.setHours(10, 0, 0, 0); 
    }

    if (targetDate < now) {
        targetDate.setDate(targetDate.getDate() + 1); // 과거면 내일로
    }
    return targetDate;
}

// [핵심] 경로 그리기 (Transit 실패 시 Driving 전환)
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
            // 일본 등 대중교통 데이터 미지원 지역 -> Driving으로 전환
            const requestDriving = {
                origin: origin.location,
                destination: destination.location,
                travelMode: google.maps.TravelMode.DRIVING
            };
            directionsService.route(requestDriving, (resDriving, statusDriving) => {
                if (statusDriving === 'OK') {
                    renderPolyline(resDriving.routes[0].overview_path, origin, destination);
                } else {
                    // 모두 실패 시 직선 (최후의 수단)
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
        strokeColor: '#364fc7', // 진한 파랑
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

function createRouteButton(position, origin, destination) {
    if(!position) return;
    const btnDiv = document.createElement('div');
    btnDiv.className = 'route-info-marker';
    btnDiv.innerHTML = `INFO <i class="fas fa-info-circle"></i>`;
    btnDiv.addEventListener('click', (e) => { 
        e.stopPropagation(); 
        showRouteDetailModal(origin, destination); 
    });
    const infoMarker = new AdvancedMarkerElement({
        map, position: position, content: btnDiv, title: "정보 확인"
    });
    mapRouteMarkers.push(infoMarker);
}

// 상세 정보 모달
function showRouteDetailModal(origin, dest) {
    const container = document.getElementById('route-comparison');
    if(container) container.innerHTML = '<p style="text-align:center;">경로 정보 로딩 중...</p>';
    openModal('route-detail-modal');

    const targetDate = getSafeTransitDate(origin.time);

    // 대중교통 시도
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
                // 실패 시 안내 문구 + 대체 수단
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

// ==========================================
// 9. 리스트 & 드래그 앤 드롭 (SortableJS)
// ==========================================
function renderPlaceList() {
    const list = document.getElementById('places-list');
    if(!list) return;
    list.innerHTML = '';
    
    currentTripData.days[currentDayIndex].places.forEach((place, idx) => {
        const div = document.createElement('div');
        div.className = 'place-card';
        div.setAttribute('data-id', place.id);
        
        div.onclick = (e) => {
            if(e.target.closest('button')) return;
            map.panTo(place.location); map.setZoom(15); 
            fetchWeather(place.location.lat, place.location.lng, place.name);
        };
        
        const hasMeta = place.memo || place.cost;
        
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
                    ${place.memo ? `📝 ${place.memo}<br>` : ''} 
                    ${place.cost ? `💰 ${place.cost.toLocaleString()}원` : ''}
                </div>
            </div>`;
        list.appendChild(div);
    });

    // 드래그 앤 드롭
    if (sortableInstance) sortableInstance.destroy();
    sortableInstance = new Sortable(list, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: function (evt) {
            const oldIdx = evt.oldIndex;
            const newIdx = evt.newIndex;
            if (oldIdx === newIdx) return;
            const places = currentTripData.days[currentDayIndex].places;
            const movedItem = places.splice(oldIdx, 1)[0];
            places.splice(newIdx, 0, movedItem);
            saveTrip();
        },
    });
}

// 장소 추가 모달 로직
let searchTimer;
function handlePlaceSearch(e) {
    clearTimeout(searchTimer);
    const query = e.target.value;
    if(query.length < 2) return;
    searchTimer = setTimeout(async () => {
        if(!Place) return;
        const { places } = await Place.searchByText({ textQuery: query, fields: ['displayName', 'formattedAddress', 'location', 'types'], locationBias: map.getCenter() });
        const resDiv = document.getElementById('search-results');
        resDiv.innerHTML = ''; resDiv.classList.add('active');
        if(places) {
            places.slice(0, 5).forEach(p => {
                const div = document.createElement('div');
                div.className = 'result-item';
                div.innerHTML = `<b>${p.displayName}</b><br><small>${p.formattedAddress}</small>`;
                div.onclick = () => { initiateAddPlace({ displayName: p.displayName, formattedAddress: p.formattedAddress, location: p.location, types: p.types }); };
                resDiv.appendChild(div);
            });
        }
    }, 100);
}

function initiateAddPlace(p) { 
    tempPlaceData = p; 
    document.getElementById('selected-place-name').innerText = p.displayName; 
    document.getElementById('new-place-time').value = "10:00"; 
    openModal('time-selection-modal'); 
    document.getElementById('search-results').classList.remove('active'); 
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

// GPS 내 위치
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

// [NEW] 주변 명소 추천 (모달)
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

// ==========================================
// 10. 기타 헬퍼 (Window 전역 등록)
// ==========================================
window.switchTab = function(tabName) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    const targetBtn = document.querySelector(`.tab-btn[onclick="switchTab('${tabName}')"]`);
    if(targetBtn) targetBtn.classList.add('active');
    
    const targetContent = document.getElementById(`tab-${tabName}`);
    if(targetContent) targetContent.classList.add('active');
    
    if(tabName === 'budget') renderBudget();
    if(tabName === 'social') renderMembers();
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
function selectDay(idx) { currentDayIndex = idx; renderDayTabs(); renderPlaceList(); renderMap(); }

async function renderMembers() {
    const list = document.getElementById('member-list');
    if(!list) return;
    list.innerHTML = '';
    const emails = currentTripData.members;
    
    try {
        const q = query(collection(db, "users"), where("email", "in", emails.slice(0, 10)));
        const snap = await getDocs(q);
        const userMap = {};
        snap.forEach(d => userMap[d.data().email] = d.data());
        
        emails.forEach(email => {
            const user = userMap[email] || { displayName: email.split('@')[0], photoURL: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjYyI+PHBhdGggZD0iTTEyIDEyYzIuMjEgMCA0LTEuNzkgNC00czLTEuNzktNC00LTQtNCAxLjc5LTQgNCAxLjc5IDQgNCA0em0wIDJjLTIuNjcgMC04IDEuMzQtOCA0djJoMTZ2LTJjMC0yLjY2LTUuMzMtNC04LTR6Ii8+PC9zdmc+' };
            list.innerHTML += `
                <div class="member-item">
                    <img src="${user.photoURL}" class="member-avatar" style="width:50px; height:50px; border-radius:50%; object-fit:cover; margin-bottom:5px;">
                    <div class="member-name" style="font-size:0.85em; font-weight:600;">${user.displayName}</div>
                </div>`;
        });
    } catch(e) {
        emails.forEach(m => list.innerHTML += `<div class="member-item">${m.split('@')[0]}</div>`);
    }
}

window.openEditPlaceModal = function(id) { 
    currentEditPlaceId=id; 
    const p=currentTripData.days[currentDayIndex].places.find(p=>p.id===id); 
    if(!p)return; 
    document.getElementById('edit-place-name').value=p.name; 
    document.getElementById('edit-place-time').value=p.time; 
    document.getElementById('edit-place-memo').value=p.memo||''; 
    document.getElementById('edit-place-cost').value=p.cost||''; 
    openModal('place-edit-modal'); 
}

function savePlaceDetails() { 
    if(!currentEditPlaceId)return; 
    const p=currentTripData.days[currentDayIndex].places.find(p=>p.id===currentEditPlaceId); 
    if(p){ 
        p.name = document.getElementById('edit-place-name').value;
        p.time=document.getElementById('edit-place-time').value; 
        p.memo=document.getElementById('edit-place-memo').value; 
        p.cost=Number(document.getElementById('edit-place-cost').value); 
        saveTrip(); 
        closeModal('place-edit-modal'); 
    } 
}

window.removePlace = function(id) { 
    showConfirm("정말 삭제하시겠습니까?", () => {
        currentTripData.days[currentDayIndex].places=currentTripData.days[currentDayIndex].places.filter(p=>p.id!==id); 
        saveTrip(); 
    });
}

function renderBudget() { 
    const l=document.getElementById('budget-list'); 
    if(!l) return;
    let t=0; l.innerHTML=''; 
    currentTripData.days.forEach(d=>{
        d.places.forEach(p=>{
            if(p.cost>0){
                t+=p.cost;
                l.innerHTML+=`<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee;"><span>${p.name}</span><span>${p.cost.toLocaleString()}원</span></div>`;
            }
        });
    }); 
    document.getElementById('total-cost').innerText=`${t.toLocaleString()} 원`; 
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

// 검색 결과 닫기 함수
window.closeSearchResults = function() {
  const resultsDiv = document.getElementById('search-results');
  if (resultsDiv) {
    resultsDiv.classList.remove('active');
  }
};

// 외부 클릭 시 검색 결과 닫기
document.addEventListener('click', (e) => {
  const searchBox = document.querySelector('.search-box');
  const resultsDiv = document.getElementById('search-results');
  
  if (searchBox && resultsDiv && !searchBox.contains(e.target)) {
    resultsDiv.classList.remove('active');
  }
});

// ESC 키로 검색 결과 닫기
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeSearchResults();
  }
});

function copyInviteLink() { const copyText = document.getElementById("invite-link"); copyText.select(); navigator.clipboard.writeText(copyText.value).then(() => { showSuccess("링크 복사 완료!"); }); }
function redirectToBooking() { const places = currentTripData.days[currentDayIndex].places; if (places.length === 0) return; const lastPlace = places[places.length - 1]; const query = encodeURIComponent(`${currentTripData.destination} ${lastPlace.name} ticket`); window.open(`https://www.google.com/search?q=${query}`, '_blank'); }

function openModal(id) { document.getElementById(id).classList.add('active'); }
window.closeModal = (id) => document.getElementById(id).classList.remove('active');
function showScreen(id) { document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); document.getElementById(id).classList.add('active'); }