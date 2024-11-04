import { 
    ref, onValue, getDatabase, update, get, remove 
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js';
import { 
    auth, db, realTimeDb 
} from './firebase-config.js';
import { 
    collection, getDocs, deleteField, updateDoc, doc 
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import { 
    setPersistence, browserLocalPersistence, onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';

let player;
let customerData = [];
let currentVideo = null;
let nextVideo = null;
let isVideoPlayerInitialized = false;
let isUpdating = false;
let lastUpdatedUserId = null;

const initialVideoIds = ['peGSKWW8-EA', 'Aeomc7RwiQw'];

async function initializeAuth() {
    try {
        await setPersistence(auth, browserLocalPersistence);
        onAuthStateChanged(auth, (user) => {
            if (user) {
                fetchAndDisplayUserData(user.uid);
            } else {
                window.location.href = "/search";
            }
        });
    } catch (error) {
        console.error("Error setting persistence:", error);
    }
}

async function fetchAndDisplayUserData(currentUserId) {
    try {
        const usersRef = ref(realTimeDb, 'users');
        onValue(usersRef, async (snapshot) => {
            if (!snapshot.exists()) return;

            const usersData = snapshot.val();
            const userIndexes = processUserData(usersData, currentUserId);
            const songs = await fetchSongsFromFirestore();

            mapCustomerData(userIndexes, songs);
            displaySongs(userIndexes, songs, currentUserId);

            if (!isVideoPlayerInitialized) {
                initializeVideoPlayer();
                isVideoPlayerInitialized = true;
            }
        }, (error) => {
            console.error("Error reading user data:", error);
        });
    } catch (error) {
        console.error("Error fetching user data:", error);
    }
}

function processUserData(usersData, currentUserId) {
    const usersArray = Object.entries(usersData).map(([uid, userData]) => ({ uid, ...userData }));

    const filteredUsers = usersArray.filter(user => !user.played);
    filteredUsers.sort((a, b) => {
        if (a.select !== b.select) return b.select - a.select;
        if (a.priority !== b.priority) return b.priority - a.priority;
        return a.timestamp - b.timestamp;
    });

    const allSelectFalse = filteredUsers.every(user => !user.select);
    if (allSelectFalse && filteredUsers.length) {
        update(ref(realTimeDb, `users/${filteredUsers[0].uid}`), { select: true })
            .catch(error => console.error("Error updating select:", error));
        filteredUsers[0].select = true;
    }

    return filteredUsers.map((user, index) => ({
        ...user,
        index,
        isCurrentUser: user.uid === currentUserId
    }));
}

async function fetchSongsFromFirestore() {
    const songsCollection = collection(db, 'users');
    const songDocs = await getDocs(songsCollection);

    return songDocs.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

function mapCustomerData(userIndexes, songs) {
    customerData = userIndexes.map(user => {
        const song = songs.find(s => s.id === user.uid);
        if (!song) console.warn(`No song found for userId: ${user.uid}`);
        return { customerId: user.uid, videoId: song ? song.videoId : null };
    });

    currentVideo = customerData[0];
    nextVideo = customerData[1];
}

function displaySongs(userIndexes, songs, currentUserId) {
    const playlistContainer = document.querySelector('.ytm-playlist-panel-renderer-v2 lazy-list');
    playlistContainer.innerHTML = '';

    userIndexes.forEach((user, index) => {
        const song = songs.find(s => s.id === user.uid);
        if (!song) return;

        const { minutes, seconds } = parseDuration(song.duration);
        const durationText = `${minutes} phút, ${seconds} giây`;
        const backgroundColor = getBackgroundColor(user, index, currentUserId, userIndexes[0].uid);
        const songElement = generateSongElement(song, durationText, backgroundColor, index, user.uid);

        playlistContainer.innerHTML += songElement;
    });
}

function parseDuration(duration) {
    const [minutes, seconds] = duration.split(':').map(Number);
    return { minutes, seconds };
}

function getBackgroundColor(user, index, currentUserId, firstUserId) {
    if (index === 0) {
        return user.uid !== currentUserId ? 'rgb(235, 222, 221)' : '';
    }
    return user.uid === currentUserId && user.uid !== firstUserId ? 'rgb(221, 229, 235)' : '';
}

function generateSongElement(song, durationText, backgroundColor, index, userId) {
    return `
        <ytm-playlist-panel-video-renderer 
            class="ytm-playlist-panel-video-renderer-v2 ${index === 0 ? 'ytm-playlist-panel-video-renderer-v2--selected' : ''}" 
            aria-selected="${index === 0}" 
            data-has-overflow-menu="false" 
            style="background-color: ${backgroundColor};" 
            data-video-id="${song.videoId}" 
            data-index="${index}" 
            data-user-id="${userId}">
            <div class="compact-media-item">
                <a href="/songs?v=${song.videoId}" class="compact-media-item-image" aria-hidden="true">
                    <ytm-compact-thumbnail>
                        <img src="${song.thumbnail}" alt="" class="yt-core-image">
                        <div class="badge-shape-wiz__text">${song.duration}</div>
                    </ytm-compact-thumbnail>
                </a>
                <div class="compact-media-item-metadata">
                    <a href="/songs?v=${song.videoId}" class="compact-media-item-metadata-content">
                        <h4>${song.songName}</h4>
                        <div>${song.fullName} ${song.location ? `đến từ ${song.location}` : ''}</div>
                    </a>
                </div>
            </div>
        </ytm-playlist-panel-video-renderer>
    `;
}

function initializeVideoPlayer() {
    if (!currentVideo && !nextVideo) {
        playRandomVideo();
    } else if (currentVideo) {
        createYouTubePlayer(currentVideo.videoId);
    }
}

function createYouTubePlayer(videoId) {
    const showControls = $(window).width() >= 768;
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
    const update = () => {
        updateVideoData();
        if (isUpdating) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
}

function updateVideoData() {
    if (!player) return;

    const dbRef = ref(getDatabase(), 'videoStatus');
    const currentTime = Math.floor(player.getCurrentTime());
    const playerState = player.getPlayerState();

    if (!isNaN(currentTime)) {
        update(dbRef, {
            currentVideoId: currentVideo?.videoId || null,
            nextVideoId: nextVideo?.videoId || null,
            status: playerState === YT.PlayerState.PLAYING ? 'play' : 'pause',
            currentTime,
            volume: player.getVolume()
        }).catch(error => console.error("Error updating video data: ", error));
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

function monitorVideoStatusChanges() {
    const dbRef = ref(getDatabase(), 'videoStatus/currentVideoId');
    onValue(dbRef, (snapshot) => {
        const newVideoId = snapshot.val();
        if (newVideoId && player?.getVideoData().video_id !== newVideoId) {
            const selectedVideo = customerData.find(video => video.videoId === newVideoId);
            if (selectedVideo) {
                currentVideo = selectedVideo;
                player.loadVideoById(selectedVideo.videoId);
            }
        }
    });
}

function handleVideoEnd() {
    if (!player) return;

    markCurrentUserAsPlayed()
        .then(() => removeUserVideoData(lastUpdatedUserId))
        .then(() => fetchUpdatedUserData());
}

async function markCurrentUserAsPlayed() {
    if (!currentVideo) return;
    const userRef = ref(realTimeDb, `users/${currentVideo.customerId}`);
    await update(userRef, { played: true });
}

async function removeUserVideoData(userId) {
    if (!userId) return;
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, { videoId: deleteField() });
}

async function fetchUpdatedUserData() {
    const usersRef = ref(realTimeDb, 'users');
    const usersSnapshot = await get(usersRef);
    if (!usersSnapshot.exists()) return;

    const usersData = usersSnapshot.val();
    const userIndexes = processUserData(usersData);
    const songs = await fetchSongsFromFirestore();

    mapCustomerData(userIndexes, songs);
    displaySongs(userIndexes, songs, currentUserId);

    if (!customerData.length) {
        playRandomVideo();
        return;
    }

    const newVideoId = customerData[0].videoId;
    player.loadVideoById(newVideoId);
    currentVideo = customerData[0];
    nextVideo = customerData[1];
}

function playRandomVideo() {
    const randomVideoId = initialVideoIds[Math.floor(Math.random() * initialVideoIds.length)];
    createYouTubePlayer(randomVideoId);
}

document.addEventListener("DOMContentLoaded", () => {
    initializeAuth();
    monitorVideoStatusChanges();
});
