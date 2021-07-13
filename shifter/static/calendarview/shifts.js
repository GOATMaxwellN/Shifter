"use strict";


function showCreateShiftView() {
    document.getElementById("select-shift-view").style.display = "none";
    document.getElementById("create-shift-view").style.display = "grid";
}


function hideCreateShiftView() {
    document.getElementById("create-shift-view").style.display = "none";
    document.getElementById("select-shift-view").style.display = "grid";
}


function getShifts() {
    let req = new XMLHttpRequest();
    req.responseType = "json";
    req.onload = function () {
        let shifts = this.response;
        showShifts(shifts);
    }
    req.open("GET", GET_SHIFTS_ENDPOINT);
    req.send();
}


function showShifts(shifts) {
    let shiftsDropdown = document.getElementById("shifts-dropdown-list");
    let html = "";
    for (let s in shifts) {
        html += `<option value="${s}">${s}</option>`;
    }
    shiftsDropdown.innerHTML = html;
}


function createShift(evt) {
    evt.preventDefault();

    let xhr = new XMLHttpRequest();
    let fd = new FormData(evt.target); // evt.target is the form

    // If successful, remove the create shift view and loading
    // animation as well as update the shifts dropdown list
    xhr.onload = function () {
        loading.style.display = "none";
        hideCreateShiftView();
        getShifts();
    }

    xhr.onerror = function () {
        error.style.display = "block";
        error.style.animation = "disappear 1s 1";
    }

    xhr.open("POST", CREATE_SHIFT_ENDPOINT);
    xhr.send(fd);
    evt.target.reset() // Clear the form after sending request

    // While waiting for request, show loading animation
    let [loading, error] = document.querySelectorAll("#create-shift-status span");
    loading.style.display = "block";
}


const GET_SHIFTS_ENDPOINT = "http://127.0.0.1:5000/api/get-shifts";
const CREATE_SHIFT_ENDPOINT = "http://127.0.0.1:5000/api/create-shift";
