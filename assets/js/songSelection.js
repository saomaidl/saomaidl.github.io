import { auth, realTimeDb } from './firebase-config.js';
import { ref, set, push, get } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js';
import { doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';

async function handleSongSelection(videoId, title, thumbnail, viewCount, duration, channelThumbnailUrl, channelTitle, publishedAt, channelId) {
    const user = auth.currentUser;

    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists() && userDoc.data().songSelected) {
        loadSelectedFile();
        return;
    }

    try {
        // Lưu thông tin bài hát vào Firestore
        await setDoc(userDocRef, {
            songSelected: true,
            videoId: videoId,
            songName: title,
            thumbnail: thumbnail,
            viewCount: viewCount,
            duration: duration,
            channelThumbnailUrl: channelThumbnailUrl,
            channelTitle: channelTitle,
            publishedAt: publishedAt,
            channelId: channelId,
            timestamp: Date.now() // Thêm timestamp
        }, { merge: true });

        // Tạo tham chiếu đến nhánh users trong Realtime Database
        const usersRef = ref(realTimeDb, 'users');
        const newUserRef = push(usersRef);

        // Lưu thông tin vào Realtime Database với id tự động, played, và priority ban đầu là false
        await set(newUserRef, {
            timestamp: Date.now(),
            id: null, // Tạm thời đặt null, sẽ cập nhật sau
            played: false,
            priority: false // Mặc định là false, có thể thay đổi sau
        });

        // Cập nhật id và priority
        await updateID();

        loadSelectedFile();
    } catch (error) {
        console.error("Error saving song: ", error);
    }
}

async function updateID() {
    const usersRef = ref(realTimeDb, 'users');
    const snapshot = await get(usersRef);

    if (snapshot.exists()) {
        const usersData = snapshot.val();
        const usersArray = Object.keys(usersData).map(key => ({
            key, // Lưu lại key cho việc cập nhật
            ...usersData[key]
        }));

        // Sắp xếp theo timestamp
        usersArray.sort((a, b) => a.timestamp - b.timestamp);

        // Cập nhật id theo thứ tự timestamp và giữ lại priority
        for (let i = 0; i < usersArray.length; i++) {
            const userRef = ref(realTimeDb, `users/${usersArray[i].key}`);
            await set(userRef, {
                ...usersArray[i],
                id: i + 1 // Cập nhật thứ tự id dựa trên vị trí trong mảng
            });
        }
    }
}

async function loadSelectedFile() {
    const user = auth.currentUser;
    const userRef = ref(realTimeDb, `users/${user.uid}`);
    const snapshot = await get(userRef);

    if (snapshot.exists() && snapshot.val().songSelected) {
        $('#content').load('/assets/html/selected.html', function(response, status, xhr) {
            if (status === "error") {
                console.error("Không thể tải tệp selected.html:", xhr.status, xhr.statusText);
            } else {
                $('body').css('overflow', 'hidden');
            }
        });
    }
}

$(document).on('click', '#playlist', function() {
    const videoId = $(this).data('video-id');
    const title = $(this).data('video-title');
    const thumbnail = $(this).data('thumbnail');
    const viewCount = $(this).data('viewCount');
    const duration = $(this).data('duration');
    const channelThumbnailUrl = $(this).data('channelThumbnailUrl');
    const channelTitle = $(this).data('channelTitle');
    const publishedAt = $(this).data('publishedAt');
    const channelId = $(this).data('channelId');

    handleSongSelection(videoId, title, thumbnail, viewCount, duration, channelThumbnailUrl, channelTitle, publishedAt, channelId);
});
