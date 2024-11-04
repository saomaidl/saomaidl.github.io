import { ref, onValue, getDatabase, update, get, remove } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js';
import { auth, db, realTimeDb } from './firebase-config.js';
import { collection, getDocs, deleteField, updateDoc, doc } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import { setPersistence, browserLocalPersistence, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';

let player;
let customerData = [];
let currentVideo = null;
let nextVideo = null;
let isVideoPlayerInitialized = false;
let isUpdating = false;
let lastUpdatedUserId = null;

const initialVideoIds = ['peGSKWW8-EA', 'Aeomc7RwiQw'];

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
    const usersRef = ref(realTimeDb, 'users');

    onValue(usersRef, async (snapshot) => {
        if (!snapshot.exists()) return;

        const usersData = snapshot.val();
        const userIndexes = processAllUserData(usersData, currentUserId);
        const songs = await getSongsFromFirestore();

        customerData = userIndexes.map(user => {
            const song = songs.find(s => s.id === user.uid);
            return {
                customerId: user.uid,
                videoId: song ? song.videoId : null
            };
        });

        currentVideo = customerData[0];
        nextVideo = customerData[1];

        displaySongs(userIndexes, songs, currentUserId);

        if (!isVideoPlayerInitialized) {
            initializeVideoPlayer();
            isVideoPlayerInitialized = true;
        }
    }, (error) => {
        console.error("Error reading user data:", error);
    });
}

function processAllUserData(usersData, currentUserId) {
    const usersArray = Object.keys(usersData).map(key => ({
        uid: key,
        ...usersData[key]
    }));

    const filteredUsers = usersArray.filter(user => !user.played);

    filteredUsers.sort((a, b) => {
        const selectA = Number(a.select === true);
        const selectB = Number(b.select === true);
        if (selectA !== selectB) return selectB - selectA;

        const priorityA = Number(a.priority === true);
        const priorityB = Number(b.priority === true);
        if (priorityA !== priorityB) return priorityB - priorityA;

        return a.timestamp - b.timestamp;
    });

    const result = filteredUsers.map((user, index) => ({
        ...user,
        index,
        isCurrentUser: user.uid === currentUserId
    }));

    handleInitialSelect(result);
    return result;
}

function handleInitialSelect(users) {
    const allSelectFalse = users.every(user => user.select === false);
    if (allSelectFalse && users.length > 0) {
        const firstUser = users[0];
        const userRef = ref(realTimeDb, `users/${firstUser.uid}`);
        update(userRef, { select: true })
            .then(() => console.log(`Updated select for user ${firstUser.uid} to true.`))
            .catch(error => console.error("Error updating select:", error));
        firstUser.select = true; // Update locally as well
    }
}

async function getSongsFromFirestore() {
    const songsCollection = collection(db, 'users');
    const songDocs = await getDocs(songsCollection);
    return songDocs.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

function displaySongs(userIndexes, songs, currentUserId) {
    const playlistContainer = document.querySelector('.ytm-playlist-panel-renderer-v2 lazy-list');
    playlistContainer.innerHTML = '';

    userIndexes.forEach((user, index) => {
        const song = songs.find(s => s.id === user.uid);
        if (song) {
            const durationText = formatDuration(song.duration);
            const backgroundColor = getBackgroundColor(user, index, currentUserId);
            const selectedClass = index === 0 ? 'ytm-playlist-panel-video-renderer-v2--selected' : '';
            const ariaSelected = index === 0 ? 'true' : 'false';

            const songElement = createSongElement(song, durationText, selectedClass, ariaSelected, backgroundColor, user.uid);
            playlistContainer.innerHTML += songElement;
        }
    });
}

function formatDuration(duration) {
    const [minutes, seconds] = duration.split(':');
    return `${parseInt(minutes)} phút, ${parseInt(seconds)} giây`;
}

function getBackgroundColor(user, index, currentUserId) {
    if (index === 0) {
        return user.uid === currentUserId ? '' : 'style="background-color: rgb(235, 222, 221);"';
    }
    return user.uid === currentUserId ? 'style="background-color: rgb(221, 229, 235);"' : '';
}

function createSongElement(song, durationText, selectedClass, ariaSelected, backgroundColor, userId) {
    return `
        <ytm-playlist-panel-video-renderer class="ytm-playlist-panel-video-renderer-v2 ${selectedClass}" aria-selected="${ariaSelected}" data-has-overflow-menu="false" ${backgroundColor} data-video-id="${song.videoId}" data-index="${userId}">
            <div class="compact-media-item">
                <a href="/songs?v=${song.videoId}" class="compact-media-item-image" aria-hidden="true">
                    <ytm-compact-thumbnail>
                        <img src="${song.thumbnail}" alt="">
                    </ytm-compact-thumbnail>
                </a>
                <div class="compact-media-item-metadata">
                    <a href="/songs?v=${song.videoId}" class="compact-media-item-metadata-content">
                        <h4 class="compact-media-item-headline" aria-label="${song.songName} của ${song.channelTitle} ${durationText}">
                            <span>${song.songName}</span>
                        </h4>
                        <div class="subhead" aria-hidden="true">
                            <div class="compact-media-item-byline small-text">
                                <span>${song.fullName} ${song.location ? `đến từ ${song.location}` : ""}</span>
                            </div>
                        </div>
                    </a>
                </div>
            </div>
        </ytm-playlist-panel-video-renderer>
    `;
}

function initializeVideoPlayer() {
  if (!currentVideo) {
    const randomIndex = Math.floor(Math.random() * initialVideoIds.length);
    const randomVideoId = initialVideoIds[randomIndex];
    createYouTubePlayer(randomVideoId);
  } else {
    createYouTubePlayer(currentVideo.videoId);
  }
}

function createYouTubePlayer(videoId) {
    const showControls = window.innerWidth >= 768;
    player = new YT.Player("player", {
        videoId,
        playerVars: {
            autoplay: 1,
            controls: showControls ? 1 : 0,
            rel: 0,
            iv_load_policy: 3,
            mute: showControls ? 0 : 1,
            playsinline: 1,
            enablejsapi: 1,
            modestbranding: 1,
            wmode: 'transparent',
            showinfo: 0,
        },
        events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    event.target.setPlaybackQuality('highres');
    event.target.playVideo();
    startUpdatingVideoData();
}

function startUpdatingVideoData() {
    isUpdating = true;
    updateVideoData();
    function update() {
        if (isUpdating) {
            updateVideoData();
            requestAnimationFrame(update);
        }
    }
    requestAnimationFrame(update);
}

function stopUpdatingVideoData() {
    isUpdating = false;
}

function updateVideoData() {
    const dbRef = ref(getDatabase(), 'videoStatus');
    if (player) {
        const playerState = player.getPlayerState();
        const currentTime = Math.floor(player.getCurrentTime());
        if (!isNaN(currentTime)) {
            update(dbRef, {
                currentVideoId: currentVideo ? currentVideo.videoId : null,
                nextVideoId: nextVideo ? nextVideo.videoId : null,
                status: playerState === YT.PlayerState.PLAYING ? 'play' : 'pause',
                currentTime,
                volume: player.getVolume()
            }).catch((error) => {
                console.error("Error updating video data: ", error);
            });
        }
    }
}

function onPlayerStateChange(event) {
    switch (event.data) {
        case YT.PlayerState.ENDED:
            handleVideoEnd();
            break;
        case YT.PlayerState.PAUSED:
        case YT.PlayerState.BUFFERING:
            isUpdating = false;
            break;
        case YT.PlayerState.PLAYING:
            if (!isUpdating) {
                isUpdating = true;
                player.setPlaybackQuality('highres');
                updateVideoData();
                startUpdatingVideoData();
            }
            break;
    }
}

function handleVideoEnd() {
    const currentIndex = customerData.findIndex(user => user.customerId === currentVideo.customerId);
    const nextIndex = currentIndex + 1 < customerData.length ? currentIndex + 1 : 0; // Loop back to first video if at end
    nextVideo = customerData[nextIndex];
    currentVideo = customerData[nextIndex];

    if (nextVideo) {
        updateVideoData();
        player.loadVideoById(nextVideo.videoId);
    }
}

// Listening for changes in videoStatus from Realtime Database
const videoStatusRef = ref(realTimeDb, 'videoStatus');
onValue(videoStatusRef, (snapshot) => {
    if (snapshot.exists()) {
        const statusData = snapshot.val();
        handleVideoStatusUpdate(statusData);
    }
}, (error) => {
    console.error("Error reading video status:", error);
});

function handleVideoStatusUpdate(statusData) {
    if (statusData.currentVideoId && statusData.currentVideoId !== currentVideo.videoId) {
        const videoIndex = customerData.findIndex(user => user.videoId === statusData.currentVideoId);
        if (videoIndex !== -1) {
            currentVideo = customerData[videoIndex];
            player.loadVideoById(currentVideo.videoId);
        }
    }
}


$(document).ready(function() {
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
      const usersRef = ref(realTimeDb, 'users');
      onValue(usersRef, (snapshot) => {
        if (snapshot.exists()) {
          const usersData = snapshot.val();
          Object.keys(usersData).forEach((key) => {
            if (key !== userId) {
              updates[`users/${key}/priority`] = false;
            }
          });
          update(ref(realTimeDb), updates)
            .then(() => {
            })
            .catch((error) => {
              console.error(`Lỗi cập nhật dữ liệu: ${error}`);
            });
        }
      }, { onlyOnce: true });
    }
  });
});
