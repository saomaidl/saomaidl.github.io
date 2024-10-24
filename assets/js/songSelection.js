import { auth, db } from './firebase-config.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import { getDatabase, ref, set } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js';

async function handleSongSelection(videoId, title, thumbnail, viewCount, duration, channelThumbnailUrl, channelTitle, publishedAt, channelId) {
    const user = auth.currentUser;
    const userDoc = await getDoc(doc(db, 'users', user.uid));

    if (userDoc.exists() && userDoc.data().songSelected) {
        loadSelectedFile();
        return;
    }

    try {
        await setDoc(doc(db, 'users', user.uid), {
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
        }, { merge: true });

        const dbRef = ref(getDatabase(), `users/${user.uid}`);
        await set(dbRef, {
            priority: false
        });

        loadSelectedFile();
    } catch (error) {
        console.error("Error saving song: ", error);
    }
}

async function loadSelectedFile() {
    const user = auth.currentUser;
    const userDoc = await getDoc(doc(db, 'users', user.uid));

    if (userDoc.exists() && userDoc.data().songSelected) {
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
