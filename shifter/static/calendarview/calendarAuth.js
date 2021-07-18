"use strict";


// If user has no calendar, this wrapper exists
if (document.querySelector(".connect-btns-wrapper")) {
    // Links connect buttons to their respective auth workflow
    document.querySelector(".google-btn").addEventListener("click", connectToGoogle);
    document.querySelector(".outlook-btn").addEventListener("click", connectToOutlook);

    // Error msg may be shown if user failed to connect a calendar.
    try {
        document.querySelector("#error").addEventListener("click", dismissErrMsg);
    } catch (e) {}  // Catching TypeError if this element does not exist
}


function connectToGoogle() {
    window.location.href = "http://127.0.0.1:5000/oauth/connect-to-google";
}


function connectToOutlook() {

}


function dismissErrMsg() {
    let err = document.getElementById("error");
    let connect_btns = document.getElementById("connect-btns-wrapper");
    err.remove();
    connect_btns.style.display = "block";
}


