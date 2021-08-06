"use strict";
import { drawCustomShiftSelect, addShiftToCustomSelect } from "./customElems.js";
import { OFFSET } from "./calendar.js";

const GET_SHIFTS_ENDPOINT = "http://127.0.0.1:5000/api/get-shifts";
const CREATE_SHIFT_ENDPOINT = "http://127.0.0.1:5000/api/create-shift";
const DELETE_SHIFT_ENDPOINT = "http://127.0.0.1:5000/api/delete-shift";
const MONTH_TO_NUM = {
    'Jan': '01', 'Feb': '02', 'Mar': '03',
    'Apr': '04', 'May': '05', 'Jun': '06',
    'Jul': '07', 'Aug': '08', 'Sep': '09',
    'Oct': '10', 'Nov': '11', 'Dec': '12'
};


document.querySelector(".create-shift-btn").addEventListener("click", showCreateShiftView);
document.querySelector(".create-shift-go-back-btn").addEventListener("click", hideCreateShiftView);
document.querySelector("#create-shift-form").addEventListener("submit", createShift);

getShifts();


// === Switching to and from the Create Shift view ===
function showCreateShiftView() {
    document.getElementById("select-shift-view").style.display = "none";
    document.getElementById("create-shift-view").style.display = "grid";
}


function hideCreateShiftView() {
    document.getElementById("create-shift-view").style.display = "none";
    document.getElementById("select-shift-view").style.display = "grid";
}


// === Populates underlying <select> with the user's Shifts
function getShifts(e) {
    let req = new XMLHttpRequest();
    req.responseType = "json";
    req.onload = function () {
        let shifts = this.response;
        addShiftsToSelect(shifts, true);
    }
    req.open("GET", GET_SHIFTS_ENDPOINT);
    req.send();
}


function addShiftsToSelect(shifts, init = false) {

    function createOption(name, def = false) {
        let opt = document.createElement("OPTION");
        opt.innerHTML = name;
        opt.setAttribute("name", name);
        opt.setAttribute("id", name);
        // default option gets a value of -1
        if (!def) {
            opt.setAttribute("value", name);
        } else {
            opt.setAttribute("value", -1);
        }
        return opt;
    }

    let shiftsSelect = document.getElementById("shifts-dropdown-list");
    if (init) {
        shiftsSelect.add(createOption("Select a Shift:", true));
        for (let s in shifts) {
            shiftsSelect.add(createOption(s));
        }

        // Once underlying <select> is filled, create custom select
        drawCustomShiftSelect();        
    } else {
        // If init=false, shifts is just one shift and a string
        shiftsSelect.add(createOption(shifts));
        // Add it to the custom select as well
        addShiftToCustomSelect(shifts);
    }
}


// === Create and delete Shifts
export function deleteShift(e) {
    let shiftName, ogSel, selOpt, cusOpt;
    shiftName = this.dataset.shift;
    ogSel = document.querySelector(".custom-shift-select select");
    selOpt = ogSel.namedItem(shiftName);
    cusOpt = this.parentElement;
    cusOpt.style.animation = "deleting-shift 0.3s alternate infinite";

    // Make request to delete shift
    let xhr = new XMLHttpRequest();
    let url = new URL(DELETE_SHIFT_ENDPOINT);
    url.searchParams.set("shift_name", shiftName);

    xhr.onload = function() {
        // If successful, remove element from custom select and original select
        cusOpt.remove();
        ogSel.remove(selOpt.index);
        if (cusOpt.classList.contains("select-selected-option")) {
            ogSel.selectedIndex = 0;
            document.querySelector(".custom-shift-select .select-selected")
                .innerHTML = "Select a Shift:";
        }
    }

    xhr.onerror = function() {
        cusOpt.style.animation = "none";
    }

    xhr.open("DELETE", url);
    xhr.send();
}


function createShift(evt) {
    evt.preventDefault();

    let xhr = new XMLHttpRequest();
    xhr.responseType = "json";
    let fd = new FormData(evt.target); // evt.target is the form
    // Append :00 seconds to the start and end times
    fd.set("start-time", fd.get("start-time") + ":00" + OFFSET);
    fd.set("end-time", fd.get("end-time") + ":00" + OFFSET);

    // If successful, remove the create shift view and loading
    // animation as well as update the shifts dropdown list
    xhr.onload = function () {
        loading.style.display = "none";
        hideCreateShiftView();
        addShiftsToSelect(this.response["shift_name"]);
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


// === Helper Shift functions
export function getSelectedShift() {
    return document.querySelector(".custom-shift-select select")
        .selectedOptions[0].value;
}


export function concatDateShift(day, shiftName) {
    let monthYear, month, year, dateShift;
    if (day.length < 2) { day = '0' + day; }
    
    monthYear = document.querySelector(".calendar-month").getAttribute("value").split("_");
    month = MONTH_TO_NUM[monthYear[0]];
    year = monthYear[1];

    dateShift = `${year}-${month}-${day}_${shiftName}`;
    return dateShift;
} 
