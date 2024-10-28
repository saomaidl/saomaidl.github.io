import { ref, onValue } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js';
import { auth, db, realTimeDb } from './firebase-config.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import { setPersistence, browserLocalPersistence, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';

// Thiết lập phiên đăng nhập vĩnh viễn
setPersistence(auth, browserLocalPersistence)
    .then(() => {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                console.log("User is logged in:", user.uid);
                // Gọi hàm để lấy danh sách người dùng và bài hát
                getAllUserIndexes(user.uid);
            } else {
                console.error("User is not logged in. Redirecting to login page.");
                window.location.href = "/login";
            }
        });
    })
    .catch((error) => {
        console.error("Error setting persistence:", error);
    });

async function getAllUserIndexes(currentUserId) {
    try {
        const usersRef = ref(realTimeDb, 'users');

        onValue(usersRef, async (snapshot) => {
            if (!snapshot.exists()) {
                console.error("No users found in the database.");
                return;
            }

            const usersData = snapshot.val();
            const userIndexes = processAllUserData(usersData, currentUserId);

            // Lấy dữ liệu bài hát từ Firestore
            const songs = await getSongsFromFirestore();

            // Hiển thị danh sách bài hát
            displaySongs(userIndexes, songs);
        }, (error) => {
            console.error("Error reading user data:", error);
        });
    } catch (error) {
        console.error("Error getting user data:", error);
    }
}

function processAllUserData(usersData, currentUserId) {
    const usersArray = Object.keys(usersData).map(key => ({
        uid: key,
        ...usersData[key]
    }));

    const filteredUsers = usersArray.filter(user => !user.played);

    filteredUsers.sort((a, b) => {
        if (a.priority !== b.priority) {
            return b.priority - a.priority;
        }
        return a.timestamp - b.timestamp;
    });

    return filteredUsers.map((user, index) => ({
        ...user,
        index: index,
        isCurrentUser: user.uid === currentUserId
    }));
}

async function getSongsFromFirestore() {
    const songsCollection = collection(db, 'users'); // Thay đổi 'songs' thành tên collection của bạn
    const songDocs = await getDocs(songsCollection);
    
    const songs = [];
    songDocs.forEach(doc => {
        songs.push({ id: doc.id, ...doc.data() });
    });

    return songs;
}

function displaySongs(userIndexes, songs) {
    const playlistContainer = document.querySelector('.ytm-playlist-panel-renderer-v2 lazy-list'); // Chọn phần tử chứa danh sách bài hát
    playlistContainer.innerHTML = ''; // Xóa nội dung cũ trước khi thêm mới

    userIndexes.forEach(user => {
        const song = songs[user.index]; // Lấy bài hát tương ứng với index của người dùng

        if (song) {
            const songElement = `
                <ytm-playlist-panel-video-renderer class="ytm-playlist-panel-video-renderer-v2" aria-selected="false" data-has-overflow-menu="false">
                    <div class="compact-media-item">
                        <a href="/watch?v=${song.videoId}" class="compact-media-item-image" aria-hidden="true">
                            <ytm-compact-thumbnail class="video-thumbnail-container-compact center video-thumbnail-container-compact-rounded">
                                <div class="cover video-thumbnail-img video-thumbnail-bg"></div>
                                <img alt="" class="yt-core-image cover video-thumbnail-img" src="${song.thumbnailUrl}">
                                <div class="video-preview-shim"></div>
                                <div class="video-thumbnail-overlay-bottom-group">
                                    <ytm-thumbnail-overlay-time-status-renderer data-style="DEFAULT">
                                        <badge-shape class="badge-shape-wiz badge-shape-wiz--thumbnail-default badge-shape-wiz--thumbnail-badge">
                                            <div class="badge-shape-wiz__text">${song.duration}</div>
                                        </badge-shape>
                                    </ytm-thumbnail-overlay-time-status-renderer>
                                </div>
                            </ytm-compact-thumbnail>
                        </a>
                        <div class="compact-media-item-metadata">
                            <a href="/watch?v=${song.videoId}" class="compact-media-item-metadata-content">
                                <h4 class="compact-media-item-headline">
                                    <span class="yt-core-attributed-string">${song.title}</span>
                                </h4>
                                <div class="subhead" aria-hidden="true">
                                    <div class="compact-media-item-byline small-text">
                                        <span class="yt-core-attributed-string">${song.artist}</span>
                                    </div>
                                </div>
                            </a>
                        </div>
                    </div>
                </ytm-playlist-panel-video-renderer>
            `;
            playlistContainer.innerHTML += songElement; // Thêm bài hát vào playlist
        }
    });
}

// Không gọi getAllUserIndexes() ở đây, sẽ được gọi trong onAuthStateChanged
