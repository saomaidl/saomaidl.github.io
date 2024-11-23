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
            if (!snapshot.exists()) {
                // Nếu không có dữ liệu người dùng, khởi tạo video player với video ngẫu nhiên
                if (!isVideoPlayerInitialized) {
                    initializeVideoPlayer(); // Khởi tạo video player
                    isVideoPlayerInitialized = true;
                }
                return; // Không làm gì thêm
            }

            // Dữ liệu người dùng tồn tại
            const usersData = snapshot.val();
            const userIndexes = processAllUserData(usersData, currentUserId);
            const songs = await getSongsFromFirestore();

            // Xây dựng customerData
            customerData = userIndexes.map(user => {
                const userId = user.uid;
                const song = songs.find(s => s.id === userId);

                if (!song) {
                    console.warn(`No song found for userId: ${userId}`);
                }

                return {
                    customerId: userId,
                    videoId: song ? song.videoId : null
                };
            });

            // Cập nhật currentVideo và nextVideo
            currentVideo = customerData[0] || null; // Đảm bảo có giá trị mặc định
            nextVideo = customerData[1] || null; // Đảm bảo có giá trị mặc định
            
            displaySongs(userIndexes, songs, currentUserId);

            // Khởi tạo video player nếu chưa được khởi tạo
            if (!isVideoPlayerInitialized) {
                initializeVideoPlayer(); // Khởi tạo video player
                isVideoPlayerInitialized = true;
            }

        }, (error) => {
            console.error("Error reading user data:", error);
        });
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
    const userRealtimeRef = ref(realTimeDb, `users/${userId}`);
    await remove(userRealtimeRef);
  } catch (error) {
    console.error("Lỗi khi cập nhật Firestore hoặc Realtime Database:", error);
  }
}

function processAllUserData(usersData, currentUserId) {
    const usersArray = Object.keys(usersData).map(key => ({
        uid: key,
        ...usersData[key]
    }));

    const filteredUsers = usersArray.filter(user => user.played === false);

    filteredUsers.sort((a, b) => {
        const selectA = Number(a.select === true);
        const selectB = Number(b.select === true);
        if (selectA !== selectB) {
            return selectB - selectA;
        }
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

    const allSelectFalse = result.every(user => user.select === false);

    if (allSelectFalse && result.length > 0) {
        const firstUser = result[0];
        const userRef = ref(realTimeDb, `users/${firstUser.uid}`);
        update(userRef, { select: true })
            .then(() => console.log(`Updated select for user ${firstUser.uid} to true.`))
            .catch(error => console.error("Error updating select:", error));
        result[0].select = true;
    }

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
                            <span class="yt-core-attributed-string">${song.fullName} ${song.location ? `đến từ ${song.location}` : ""}</span>
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

function createYouTubePlayer(videoId) {
  const showControls = $(window).width() >= 768;
  player = new YT.Player("player", {
    videoId: videoId,
    playerVars: {
      autoplay: 1,              // Tự động phát
      controls: showControls ? 0 : 0,  // Hiển thị nút điều khiển nếu màn hình lớn
      rel: 0,                   // Không hiển thị video liên quan
      iv_load_policy: 3,        // Ẩn chú thích
      mute: showControls ? 0 : 1, // Tắt tiếng trên màn hình nhỏ
      playsinline: 1,           // Phát trong giao diện
      enablejsapi: 1,
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
  $('.playPauseIcon').on('click', function () {
    const playerState = player.getPlayerState();
    if (playerState === YT.PlayerState.PLAYING) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  });
}

function startUpdatingVideoData() {
  function update() {
    updateVideoData();
    updateProgressBar();
    if (isUpdating) {
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
        currentTime: currentTime,
        volume: player.getVolume()
      }).catch((error) => {
        console.error("Error updating video data: ", error);
      });
    }
  }
}

function updateBufferingUI(isBuffering) {
  const $playerMiddleControls = $('player-middle-controls');
  const $middleButtons = $playerMiddleControls.find('.player-controls-middle-core-buttons');
  if (isBuffering) {
    $middleButtons.addClass('screenreader-safe-hide-middle-buttons');
    if ($playerMiddleControls.find('.player-controls-spinner').length === 0) {
      const spinnerHtml = `
        <div class="player-controls-spinner">
          <div class="spinner"></div>
        </div>`;
      $playerMiddleControls.prepend(spinnerHtml);
    }
  } else {
    $middleButtons.removeClass('screenreader-safe-hide-middle-buttons');
    $playerMiddleControls.find('.player-controls-spinner').remove();
  }
}

function updateProgressBar() {
  const currentTime = player.getCurrentTime();
  const duration = player.getDuration();
  if (!duration) return;
  const playedPercent = (currentTime / duration) * 100;
  const progressBar = $('yt-progress-bar');
  if (!progressBar.length) {
    return;
  }
  const playedBar = progressBar.find('.YtProgressBarLineProgressBarPlayed');
  playedBar.css('width', `${playedPercent}%`);
  const playhead = progressBar.find('.YtProgressBarPlayheadHost');
  playhead.css('margin-left', `${playedPercent}%`);

  const currentTimeFormatted = formatTime(currentTime);
  const totalTimeFormatted = formatTime(duration);
  
  const timeDisplay = $('player-time-display');
  const elapsedTime = timeDisplay.find('.YtwPlayerTimeDisplayTime').first();
  const totalTime = timeDisplay.find('.YtwPlayerTimeDisplayTime').last();

  elapsedTime.text(currentTimeFormatted);
  totalTime.text(totalTimeFormatted);

  const videoData = player.getVideoData();
  const songTitle = videoData.title;

  const songTitleElement = timeDisplay.find('.YtwPlayerTimeDisplayTimeMacro');
  songTitleElement.text(songTitle);
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

function onPlayerStateChange(event) {
  const playPauseIcon = $('.playPauseIcon path');
  const playPauseButton = $('.playPauseIcon');
  switch (event.data) {
    case YT.PlayerState.ENDED:
      handleVideoEnd();
      playPauseIcon.attr('d', 'M5 2.69127C5 1.93067 5.81547 1.44851 6.48192 1.81506L23.4069 11.1238C24.0977 11.5037 24.0977 12.4963 23.4069 12.8762L6.48192 22.1849C5.81546 22.5515 5 22.0693 5 21.3087V2.69127Z');   
      break;

    case YT.PlayerState.PAUSED:
      isUpdating = false;
      playPauseIcon.attr('d', 'M5 2.69127C5 1.93067 5.81547 1.44851 6.48192 1.81506L23.4069 11.1238C24.0977 11.5037 24.0977 12.4963 23.4069 12.8762L6.48192 22.1849C5.81546 22.5515 5 22.0693 5 21.3087V2.69127Z');
      playPauseButton.attr('aria-label', 'Phát video');
      break;

    case YT.PlayerState.BUFFERING:
      isUpdating = false;
      break;

    case YT.PlayerState.PLAYING:
      if (!isUpdating) {
        isUpdating = true;
        player.setPlaybackQuality('highres');
        updateVideoData();
        updateProgressBar();
        startUpdatingVideoData();
        playPauseIcon.attr('d', 'M4.5 3C4.22386 3 4 3.22386 4 3.5V20.5C4 20.7761 4.22386 21 4.5 21H9.5C9.77614 21 10 20.7761 10 20.5V3.5C10 3.22386 9.77614 3 9.5 3H4.5ZM14.5 3C14.2239 3 14 3.22386 14 3.5V20.5C14 20.7761 14.2239 21 14.5 21H19.5C19.7761 21 20 20.7761 20 20.5V3.5C20 3.22386 19.7761 3 19.5 3H14.5Z');
        playPauseButton.attr('aria-label', 'Tạm dừng video');
      }
      break;
  }
}

function monitorVideoStatusChanges() {
  const dbRef = ref(getDatabase(), 'videoStatus/currentVideoId');
  onValue(dbRef, (snapshot) => {
    const newVideoId = snapshot.val();
    if (newVideoId && player && typeof player.getVideoData === 'function' && player.getVideoData().video_id !== newVideoId) {
      const selectedVideo = customerData.find(video => video.videoId === newVideoId);
      if (selectedVideo) {
        currentVideo = selectedVideo;
        replaySong(newVideoId);
      } else {
        console.warn(`No video found for the new video ID: ${newVideoId}`);
      }
    }
  }, (error) => {
    console.error("Error monitoring video status changes:", error);
  });
}

function updateUserStatus(currentUserId, nextUserId) {
  if (currentUserId === lastUpdatedUserId) {
    return;
  }
  const dbRef = ref(getDatabase(), 'users');
  const updates = {};
  if (currentUserId) {
    updates[`${currentUserId}/played`] = true;
    updates[`${currentUserId}/select`] = false;
    updates[`${currentUserId}/priority`] = false;
  }
  if (nextUserId) {
    updates[`${nextUserId}/select`] = true;
  }
  if (Object.keys(updates).length > 0) {
    update(dbRef, updates)
      .then(() => {
        lastUpdatedUserId = currentUserId;
      })
      .catch((error) => {
        console.error("Error updating user status: ", error);
      });
  }
}

function handleVideoEnd() {
  if (!player || typeof player.getVideoData !== 'function') {
    return;
  }
  const videoData = player.getVideoData();
  if (!videoData) {
    playRandomVideo();
    return;
  }
  const currentVideoIdAPI = videoData.video_id;
  if (currentVideoIdAPI) {
    const isInitialVideo = initialVideoIds.includes(currentVideoIdAPI);
    if (!isInitialVideo) {
      const currentUserId = customerData.find(video => video.videoId === currentVideoIdAPI)?.customerId;
      if (currentUserId) {
        handleEndOfVideo(currentUserId);
        const nextUserId = nextVideo ? nextVideo.customerId : null;
        updateUserStatus(currentUserId, nextUserId);
        if (nextVideo && nextVideo.videoId) {
          replaySong(nextVideo.videoId);
        } else {
          playRandomVideo();
        }
        return;
      }
    }
  }
  playRandomVideo();
  isUpdating = false;
}

function replaySong(videoId) {
  if (player) {
    player.loadVideoById(videoId);
  } else {
    createYouTubePlayer(videoId);
  }
}

function playRandomVideo() {
  const randomIndex = Math.floor(Math.random() * initialVideoIds.length);
  const randomVideoId = initialVideoIds[randomIndex];
  replaySong(randomVideoId);
}

function initializeVideoPlayer() {
  if (!currentVideo) {
    const randomIndex = Math.floor(Math.random() * initialVideoIds.length);
    const randomVideoId = initialVideoIds[randomIndex];
    createYouTubePlayer(randomVideoId);
  } else if (currentVideo) {
    createYouTubePlayer(currentVideo.videoId);
  }
}

monitorVideoStatusChanges();

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
