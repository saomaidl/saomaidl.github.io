import { auth, db } from './firebase-config.js';
import { doc, getDoc, setDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import { signInAnonymously } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';

async function loadSelectedFile() {
    const user = auth.currentUser;
    const userDocRef = doc(db, 'users', user.uid);
    onSnapshot(userDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
            const userData = docSnapshot.data();
            if (userData.songSelected) { 
                $('#content').load('/assets/html/selected.html', function(response, status, xhr) {
                    if (status === "error") {
                        console.error("Không thể tải tệp selected.html:", xhr.status, xhr.statusText);
                    } else {
                        $('body').css('overflow', 'hidden');
                    }
                });
            } else {
                $('#content').empty();
            }
        }
    });
}

async function checkUser() {
    const user = auth.currentUser;

    if (!user) {
        await signInAnonymously(auth);
        return checkUser();
    } else {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

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

checkUser();

function capitalizeAllInputs(formSelector) {
    $(formSelector).find('input[type="text"], textarea').each(function() {
        var currentVal = $(this).val();
        var capitalizedVal = capitalizeWords(currentVal);
        $(this).val(capitalizedVal);
    });
}

function capitalizeWords(str) {
    var words = str.toLowerCase().split(" ");
    for (var i = 0; i < words.length; i++) {
        words[i] = words[i].charAt(0).toUpperCase() + words[i].slice(1);
    }
    return words.join(" ");
}

$(document).on('input', 'input[type="text"], textarea', function() {
    const currentVal = $(this).val();
    $(this).val(capitalizeWords(currentVal));
});

$(document).on('submit', '#edit-full-name-form', async function(event) {
    event.preventDefault();
    capitalizeAllInputs('#edit-full-name-form');

    var fullName = $('#fullName').val().trim();
    var location = $('#location').val().trim();
    if (!fullName) {
        return;
    }

    const user = auth.currentUser;
    await setDoc(doc(db, 'users', user.uid), {
        fullName: fullName,
        location: location,
        songSelected: false
    });

    $('#content').empty();
    $('body').removeAttr('style');
});
