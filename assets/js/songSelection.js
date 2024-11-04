import { auth, db } from './firebase-config.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import { getDatabase, ref, set } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';

async function checkUserSongSelection(userId) {
    const userDoc = await getDoc(doc(db, 'users', userId));
    return userDoc.exists() && userDoc.data().songSelected;
}

async function saveSongToFirestore(userId, songData) {
    await setDoc(doc(db, 'users', userId), { ...songData, songSelected: true }, { merge: true });
}

async function saveSongToRealtimeDb(userId) {
    const dbRef = ref(getDatabase(), `users/${userId}`);
    await set(dbRef, {
        timestamp: Date.now(),
        played: false,
        select: false,
        priority: false
    });
}

function loadSelectedFile() {
    $('#content').load('/assets/html/selected.html', function(response, status, xhr) {
        if (status === "success") {
            $('body').css('overflow', 'hidden');
        }
    });
}

async function handleSongSelection(songData) {
    const user = auth.currentUser;
    if (!user) return;

    const songSelected = await checkUserSongSelection(user.uid);
    if (songSelected) {
        loadSelectedFile();
        return;
    }

    try {
        await saveSongToFirestore(user.uid, songData);
        await saveSongToRealtimeDb(user.uid);
        loadSelectedFile();
    } catch (error) {
        console.error("Error saving song: ", error);
    }
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User is logged in:", user.uid);
        $(document).on('click', '#playlist', function() {
            const songData = {
                videoId: $(this).data('video-id'),
                songName: $(this).data('video-title'),
                thumbnail: $(this).data('thumbnail'),
                viewCount: $(this).data('viewCount'),
                duration: $(this).data('duration'),
                channelThumbnailUrl: $(this).data('channelThumbnailUrl'),
                channelTitle: $(this).data('channelTitle'),
                publishedAt: $(this).data('publishedAt'),
                channelId: $(this).data('channelId')
            };

            handleSongSelection(songData);
        });
    } else {
        console.error("No user is logged in.");
    }
});
