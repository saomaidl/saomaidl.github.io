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
                window.location.href = "/search";
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
    const playlistContainer = document.querySelector('.ytm-playlist-panel-renderer-v2 lazy-list');
    playlistContainer.innerHTML = '';

    userIndexes.forEach(user => {
        const song = songs[user.index];

        if (song) {
            const [minutes, seconds] = song.duration.split(':');
            const durationText = `${parseInt(minutes)} phút, ${parseInt(seconds)} giây`;

            const songElement = `
                <ytm-playlist-panel-video-renderer class="ytm-playlist-panel-video-renderer-v2" aria-selected="false" data-has-overflow-menu="false" style="">
                  <div class="compact-media-item" data-has-subscribe-button="" data-color-palette-applied="false">
                    <a href="/songs?v=${song.videoId}" class="compact-media-item-image" aria-hidden="true">
                      <ytm-compact-thumbnail class="video-thumbnail-container-compact center video-thumbnail-container-compact-rounded">
                        <div class="cover video-thumbnail-img video-thumbnail-bg"></div>
                        <img alt="" class="yt-core-image cover video-thumbnail-img yt-core-image--fill-parent-height yt-core-image--fill-parent-width yt-core-image--content-mode-scale-aspect-fill yt-core-image--loaded" src="${song.thumbnail}">
                        <div class="video-preview-shim"></div>
                        <div class="video-thumbnail-overlay-bottom-group">
                          <ytm-thumbnail-overlay-time-status-renderer class="" data-style="DEFAULT">
                            <badge-shape class="badge-shape-wiz badge-shape-wiz--thumbnail-default badge-shape-wiz--thumbnail-badge">
                              <div class="badge-shape-wiz__text">${song.duration}</div>
                            </badge-shape>
                          </ytm-thumbnail-overlay-time-status-renderer>
                        </div>
                      </ytm-compact-thumbnail>
                    </a>
                    <div class="compact-media-item-metadata" data-has-badges="false">
                      <a href="/songs?v=${song.videoId}" class="compact-media-item-metadata-content">
                        <h4 class="compact-media-item-headline" style="">
                          <span class="yt-core-attributed-string yt-core-attributed-string--link-inherit-color" aria-label="${song.songName} của ${song.channelTitle} ${durationText}" role="text">${song.songName}</span>
                        </h4>
                        <div class="subhead" aria-hidden="true" style="">
                          <div class="compact-media-item-byline small-text">
                            <span class="yt-core-attributed-string">${song.channelTitle}</span>
                          </div>
                        </div>
                      </a>
                    </div>
                  </div>
                </ytm-playlist-panel-video-renderer>
            `;
            playlistContainer.innerHTML += songElement;
        }
    });
}
