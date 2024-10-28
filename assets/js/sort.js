import { ref, onValue } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js';
import { auth, db, realTimeDb } from './firebase-config.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import { setPersistence, browserLocalPersistence, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';

setPersistence(auth, browserLocalPersistence)
    .then(() => {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                getAllUserIndexes(user.uid);
            } else {
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
                return;
            }

            const usersData = snapshot.val();
            const userIndexes = processAllUserData(usersData, currentUserId);
            const songs = await getSongsFromFirestore();
            displaySongs(userIndexes, songs, currentUserId);
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

    const filteredUsers = usersArray.filter(user => user.played === false);

    filteredUsers.sort((a, b) => {
        const priorityA = Number(a.priority === true);
        const priorityB = Number(b.priority === true);

        if (priorityA !== priorityB) {
            return priorityB - priorityA;
        }

        return a.timestamp - b.timestamp;
    });

    const result = filteredUsers.map((user, index) => ({
        ...user,
        index: index,
        isCurrentUser: user.uid === currentUserId
    }));

    return result;
}

async function getSongsFromFirestore() {
    const songsCollection = collection(db, 'users');
    const songDocs = await getDocs(songsCollection);
    
    const songs = [];
    songDocs.forEach(doc => {
        songs.push({ id: doc.id, ...doc.data() });
    });

    return songs;
}

function displaySongs(userIndexes, songs, currentUserId) {
    const playlistContainer = document.querySelector('.ytm-playlist-panel-renderer-v2 lazy-list');
    playlistContainer.innerHTML = '';

    userIndexes.forEach((user, index) => {
        const userId = user.uid;
        const song = songs.find(s => s.id === userId);

        if (song) {
            const [minutes, seconds] = song.duration.split(':');
            const durationText = `${parseInt(minutes)} phút, ${parseInt(seconds)} giây`;

            let backgroundColor = '';
            if (index === 0 && userId !== currentUserId) {
                backgroundColor = 'style="background-color: rgb(235, 222, 221);"';
            } else if (index === 0 && userId === currentUserId) {
                backgroundColor = '';
            } else if (userId === currentUserId) {
                backgroundColor = song.id !== userIndexes[0].uid ? 'style="background-color: rgb(221, 229, 235);"' : '';
            }

            const selectedClass = index === 0 ? 'ytm-playlist-panel-video-renderer-v2--selected' : '';
            const ariaSelected = index === 0 ? 'true' : 'false';

            const songElement = `
                <ytm-playlist-panel-video-renderer class="ytm-playlist-panel-video-renderer-v2 ${selectedClass}" aria-selected="${ariaSelected}" data-has-overflow-menu="false" ${backgroundColor} data-video-id="${song.videoId}"data-index="${index}"data-user-id="${userId}">
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
                            <span class="yt-core-attributed-string">${song.title} • ${song.fullName} • ${song.location}</span>
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


let player;
function createYouTubePlayer(videoId) {
  const showControls = $(window).width() >= 768;
  player = new YT.Player("player", {
    videoId: videoId,
    playerVars: {
      autoplay: 1,
      controls: showControls ? 0 : 0,
      rel: 0,
      iv_load_policy: 3,
      mute: 0,
      playsinline: 1
    },
    events: {
      onReady: onPlayerReady
    }
  });
}

function onPlayerReady(event) {
  event.target.playVideo();
}

function replaySong(videoId) {
  if (player) {
    player.loadVideoById(videoId);
  } else {
    createYouTubePlayer(videoId);
  }
}

$(document).ready(function() {
    const initialVideoId = 'peGSKWW8-EA';
    createYouTubePlayer(initialVideoId);

    $(document).on('click', 'lazy-list a', function(event) {
        event.preventDefault();
        const parentRenderer = $(this).closest('.ytm-playlist-panel-video-renderer-v2');
        const videoId = parentRenderer.data('video-id');
        const userId = parentRenderer.data('user-id');

        if (parentRenderer.hasClass('ytm-playlist-panel-video-renderer-v2--selected')) {
            replaySong(videoId);
        } else {
            const updates = {};
            updates[`users/${userId}/priority`] = true;
            updates[`users/${userId}/played`] = false;
            const updatesRef = ref(realTimeDb);

            update(updatesRef, updates)
                .then(() => {
                    console.log(`Cập nhật thành công cho người dùng: ${userId}`);
                    replaySong(videoId);
                })
                .catch((error) => {
                    console.error(`Lỗi cập nhật dữ liệu: ${error}`);
                });
        }
    });
});
