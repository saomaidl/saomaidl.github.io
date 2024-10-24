import { auth, db } from './firebase-config.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import { signInAnonymously } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';

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

async function checkUser() {
    const user = auth.currentUser;
    if (!user) {
        await signInAnonymously(auth);
        return checkUser();
    } else {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists() || !userDoc.data().fullName) {
            $('#content').load('/assets/html/infor.html', function(response, status, xhr) {
                if (status === "success") {
                    $('body').css('overflow', 'hidden');
                }
            });
        } else {
            loadSelectedFile();
        }
    }
}

$(document).on('submit', '#edit-full-name-form', async function(event) {
    event.preventDefault();
    var title = $('#title').val().trim().toUpperCase();
    var fullName = $('#fullName').val().trim().toUpperCase();
    var location = $('#location').val().trim().toUpperCase();
    if (!title || !fullName) {
        return;
    }
    const user = auth.currentUser;
    await setDoc(doc(db, 'users', user.uid), {
        title: title,
        fullName: fullName,
        location: location,
        songSelected: false
    });
    $('#content').empty();
    $('body').removeAttr('style');
});

checkUser();
