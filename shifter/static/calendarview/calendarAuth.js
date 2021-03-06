"use strict";


// If user has no calendar, this wrapper exists
if (document.querySelector(".connect-btns-wrapper")) {
    // Links connect buttons to their respective auth workflow
    document.querySelector(".google-btn").addEventListener("click", showNameCalendarModal);
    document.querySelector(".outlook-btn").addEventListener("click", showNameCalendarModal);

    // Error msg may be shown if user failed to connect a calendar.
    try {
        document.querySelectorAll("#error")
            .forEach(v => v.addEventListener("click", dismissErrMsg));
    } catch (e) {}  // Catching TypeError if this element does not exist
}

for (let btn of document.querySelector(".config-connect-btns-wrapper").children) {
    btn.addEventListener("click", showNameCalendarModal);
}

const ROOT = window.location.protocol + "//" + window.location.host;
const CONNECT_TO_GOOGLE_URL = ROOT + "/oauth/connect-to-google";
const CONNECT_TO_OUTLOOK_URL = null;


function dismissErrMsg() {
    let err = document.getElementById("error");
    let connect_btns = document.getElementById("connect-btns-wrapper");
    err.remove();
    connect_btns.style.display = "block";
}


/* Shows modal view that asks user what to name the calendar
they're about to connect. Also sets the action of the <form>
inside the modal to the correct url. */
function showNameCalendarModal(e) {
    let modal = document.querySelector(".name-calendar-modal");
    if (this.getAttribute("value") === "google") {
        // This is the <form> elem
        modal.children[1].action = CONNECT_TO_GOOGLE_URL;
    } else if (this.getAttribute("value") === "outlook") {
        modal.children[1].action = CONNECT_TO_OUTLOOK_URL;
    }
    console.log(modal.children[1]);
    document.querySelector(".modal-wrapper").style.display = "block";
    modal.style.display = "block";
}
