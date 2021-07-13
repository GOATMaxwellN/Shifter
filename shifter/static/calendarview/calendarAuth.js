"use strict";


function connectToGoogle() {
    window.location.href = "http://127.0.0.1:5000/oauth/connect-to-google";
}


function dismissErrMsg() {
    let err = document.getElementById("error");
    let connect_btns = document.getElementById("connect-btns-wrapper");
    err.remove();
    connect_btns.style.display = "block";
}


