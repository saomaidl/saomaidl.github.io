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
    try {
        const usersRef = ref(realTimeDb, 'users');
        onValue(usersRef, async (snapshot) => {
            if (!snapshot.exists()) return;

            const usersData = snapshot.val();
            const userIndexes = processAllUserData(usersData, currentUserId);
            const songs = await getSongsFromFirestore();

            customerData = userIndexes.map(user => ({
                customerId: user.uid,
                videoId: songs.find(s => s.id === user.uid)?.videoId || null
            }));

            currentVideo = customerData[0];
            nextVideo = customerData[1];

            displaySongs(userIndexes, songs, currentUserId);
            if (!isVideoPlayerInitialized) initializeVideoPlayer();
        }, error => console.error("Error reading user data:", error));
    } catch (error) {
        console.error("Error getting user data:", error);
    }
}

async function handleEndOfVideo(userId) {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      channelId: deleteField(),
      channelThumbnailUrl: deleteField(),
      channelTitle: deleteField(),
      duration: deleteField(),
      publishedAt: deleteField(),
      songName: deleteField(),
      thumbnail: deleteField(),
      videoId: deleteField(),
      viewCount: deleteField(),
      songSelected: false
    });
    await remove(ref(realTimeDb, `users/${userId}`));
  } catch (error) {
    console.error("Error updating Firestore or Realtime Database:", error);
  }
}

function processAllUserData(usersData, currentUserId) {
    const usersArray = Object.keys(usersData).map(key => ({ uid: key, ...usersData[key] }));
    const filteredUsers = usersArray.filter(user => user.played === false);

    filteredUsers.sort((a, b) => {
        if (a.select !== b.select) return Number(b.select) - Number(a.select);
        if (a.priority !== b.priority) return Number(b.priority) - Number(a.priority);
        return a.timestamp - b.timestamp;
    });

    const result = filteredUsers.map((user, index) => ({
        ...user,
        index: index,
        isCurrentUser: user.uid === currentUserId
    }));

    if (result.every(user => user.select === false) && result.length > 0) {
        const firstUser = result[0];
        update(ref(realTimeDb, `users/${firstUser.uid}`), { select: true })
            .then(() => console.log(`Updated select for user ${firstUser.uid} to true.`))
            .catch(error => console.error("Error updating select:", error));
        result[0].select = true;
    }

    return result;
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
            const durationText = `${parseInt(song.duration.split(':')[0])} phút, ${parseInt(song.duration.split(':')[1])} giây`;
            let backgroundColor = '';
            if (index === 0 && user.uid !== currentUserId) backgroundColor = 'style="background-color: rgb(235, 222, 221);"';
            if (index === 0 && user.uid === currentUserId) backgroundColor = '';
            if (user.uid === currentUserId && song.id !== userIndexes[0].uid) backgroundColor = 'style="background-color: rgb(221, 229, 235);"';

            const songElement = `
                <ytm-playlist-panel-video-renderer class="ytm-playlist-panel-video-renderer-v2 ${index === 0 ? 'ytm-playlist-panel-video-renderer-v2--selected' : ''}" aria-selected="${index === 0}" data-video-id="${song.videoId}" data-index="${index}" data-user-id="${user.uid}">
                    <div class="compact-media-item">
                        <a href="/songs?v=${song.videoId}" class="compact-media-item-image">
                            <ytm-compact-thumbnail class="video-thumbnail-container-compact center video-thumbnail-container-compact-rounded">
                                <div class="cover video-thumbnail-img video-thumbnail-bg"></div>
                                <img alt="" class="yt-core-image cover video-thumbnail-img yt-core-image--fill-parent-height yt-core-image--fill-parent-width yt-core-image--content-mode-scale-aspect-fill yt-core-image--loaded" src="${song.thumbnail}">
                                <div class="video-thumbnail-overlay-bottom-group">
                                    <ytm-thumbnail-overlay-time-status-renderer><badge-shape class="badge-shape-wiz">${song.duration}</badge-shape></ytm-thumbnail-overlay-time-status-renderer>
                                </div>
                            </ytm-compact-thumbnail>
                        </a>
                        <div class="compact-media-item-metadata">
                            <a href="/songs?v=${song.videoId}" class="compact-media-item-metadata-content">
                                <h4 class="compact-media-item-headline">${song.songName}</h4>
                                <div class="subhead"><span class="yt-core-attributed-string">${song.fullName} ${song.location ? `đến từ ${song.location}` : ""}</span></div>
                            </a>
                        </div>
                    </div>
                </ytm-playlist-panel-video-renderer>
            `;
            playlistContainer.innerHTML += songElement;
        }
    });
}

function initializeVideoPlayer() {
    isVideoPlayerInitialized = true;
    initializeOrPlayVideo();
}

function initializeOrPlayVideo(videoId = null) {
    const initialVideoId = videoId || getRandomVideoId();
    player = new YT.Player("player", {
        videoId: initialVideoId,
        playerVars: { autoplay: 1, controls: shouldShowControls() ? 1 : 0, mute: !shouldShowControls() },
        events: { onReady: onPlayerReady, onStateChange: onPlayerStateChange }
    });
}

function getRandomVideoId() {
    return initialVideoIds[Math.floor(Math.random() * initialVideoIds.length)];
}

function shouldShowControls() {
    return $(window).width() >= 768;
}

function onPlayerReady(event) {
    event.target.setPlaybackQuality('highres');
    startUpdatingVideoData();
}

function startUpdatingVideoData() {
    isUpdating = true;
    requestAnimationFrame(function update() {
        if (isUpdating) {
            updateVideoData();
            requestAnimationFrame(update);
        }
    });
}

function updateVideoData() {
    const dbRef = ref(getDatabase(), 'videoStatus');
    const playerState = player.getPlayerState();
    const currentTime = Math.floor(player.getCurrentTime());

    if (!isNaN(currentTime)) {
        update(dbRef, {
            currentVideoId: currentVideo ? currentVideo.videoId : null,
            nextVideoId: nextVideo ? nextVideo.videoId : null,
            status: playerState === YT.PlayerState.PLAYING ? 'play' : 'pause',
            currentTime: currentTime,
            volume: player.getVolume()
        }).catch(error => console.error("Error updating video data:", error));
    }
}

function stopUpdatingVideoData() {
    isUpdating = false;
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) handleVideoEnd();
    if (event.data === YT.PlayerState.PLAYING && !isUpdating) startUpdatingVideoData();
    else stopUpdatingVideoData();
}

function handleVideoEnd() {
    const currentVideoIdAPI = player?.getVideoData().video_id;
    if (!currentVideoIdAPI || initialVideoIds.includes(currentVideoIdAPI)) {
        playRandomVideo();
        return;
    }

    if (currentVideo) {
        handleEndOfVideo(currentVideo.customerId)
            .then(() => {
                currentVideo = nextVideo;
                nextVideo = customerData[customerData.findIndex(c => c.customerId === nextVideo.customerId) + 1];
                playNextVideo();
            })
            .catch(error => console.error("Error handling end of video:", error));
    } else playRandomVideo();
}

function playNextVideo() {
    player.loadVideoById(currentVideo.videoId);
}

function playRandomVideo() {
    const randomVideoId = getRandomVideoId();
    player.loadVideoById(randomVideoId);
}
