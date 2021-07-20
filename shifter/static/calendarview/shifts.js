"use strict";


const GET_SHIFTS_ENDPOINT = "http://127.0.0.1:5000/api/get-shifts";
const CREATE_SHIFT_ENDPOINT = "http://127.0.0.1:5000/api/create-shift";
const DELETE_SHIFT_ENDPOINT = "http://127.0.0.1:5000/api/delete-shift";
const MONTH_TO_NUM = {
    'Jan': '01', 'Feb': '02', 'Mar': '03',
    'Apr': '04', 'May': '05', 'Jun': '06',
    'Jul': '07', 'Aug': '08', 'Sep': '09',
    'Oct': '10', 'Nov': '11', 'Dec': '12'
};
let pendingShifts = [];

document.addEventListener("click", closeSelect);
document.querySelector(".create-shift-btn").addEventListener("click", showCreateShiftView);
document.querySelector("#create-shift-form").addEventListener("submit", createShift);

for (let date of document.querySelectorAll(".calendar-date")) {
    date.addEventListener("click", addPendingShiftToCalendar);
}

getShifts();


function showCreateShiftView() {
    document.getElementById("select-shift-view").style.display = "none";
    document.getElementById("create-shift-view").style.display = "grid";
}


function hideCreateShiftView() {
    document.getElementById("create-shift-view").style.display = "none";
    document.getElementById("select-shift-view").style.display = "grid";
}


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


function addShiftsToSelect(shifts, init=false) {
    let shiftsSelect = document.getElementById("shifts-dropdown-list");
    if (init) {
        shiftsSelect.add(createOption("Select a Shift:"), true);
        for (let s in shifts) {
            shiftsSelect.add(createOption(s));
        }
        drawCustomShiftSelect();
    } else {
        // If init=false, shifts is just one shift and a string
        shiftsSelect.add(createOption(shifts));
        // Add it to the custom select as well
        document.querySelector(".custom-shift-select .select-options")
            .appendChild(createCustomOption(shifts));
    }
}


function createOption(name, def=false) {
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


function drawCustomShiftSelect() {
    let ogSel, selCont, selElmnt;
    ogSel = document.querySelector(".custom-shift-select select");
    selCont = document.querySelector(".custom-shift-select");
    // Create the selected element that will open and close the select
    selElmnt = document.createElement("DIV");
    selElmnt.setAttribute("class", "select-selected");
    selElmnt.innerHTML = ogSel.options[0].innerHTML;
    selCont.appendChild(selElmnt);

    // Create the options
    let opts;
    opts = document.createElement("DIV");
    opts.classList.add("select-options");
    opts.classList.add("select-hide");
    for (let i = 1; i < ogSel.length; i++) {
        let opt = createCustomOption(ogSel.options[i].innerHTML);
        opts.appendChild(opt);
    }
    selCont.appendChild(opts);

    // Show/Hide opts when selElmnt is clicked
    selElmnt.addEventListener("click", function() {
        document.querySelector(".custom-shift-select .select-options")
            .classList.toggle("select-hide");
        this.classList.toggle("select-arrow-active");
    });
}


function createCustomOption(name) {
    let opt, p, delBtn;
    opt = document.createElement("DIV");
    opt.setAttribute("class", "select-option");
    opt.addEventListener("click", updateSelElmnt)

    p = document.createElement("P");
    p.innerHTML = name;

    delBtn = document.createElement("BUTTON");
    delBtn.innerHTML = "&#xe800;"
    delBtn.setAttribute("class", "icon-trash-empty");
    delBtn.setAttribute("data-shift", name);
    delBtn.addEventListener("click", deleteShift);

    opt.appendChild(p); opt.appendChild(delBtn);
    return opt;
}


function updateSelElmnt(e) {
    // If this bubbled up from delete btn, don't do anything
    if (e.target.classList.contains("icon-trash-empty")) { return; }

    let selElmnt, optsList, ogSel;
    selElmnt = document.querySelector(".custom-shift-select .select-selected");
    selElmnt.innerHTML = this.firstElementChild.innerHTML;

    optsList = this.parentElement.children;
    ogSel = document.querySelector(".custom-shift-select select");

    // Undarkens the previous selected element in the options list
    let prevSel = optsList.querySelector(".select-selected-option");
    prevSel.classList.remove(".select-selected-option");

    // Darkens the new selected element, and select it in the underlying select
    this.classList.add("select-selected-option");
    ogSel.selectedIndex = ogSel.namedItem(this.firstElementChild.innerHTML).index;
}


function deleteShift(e) {
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
        cusOpt.style.animation = none;
    }

    xhr.open("DELETE", url);
    xhr.send();
}


function closeSelect(e) {
    // Do not close select if it was from delete btn
    if (e.target.classList.contains("icon-trash-empty") 
        || e.target.classList.contains("select-selected")) { 
        return;
    }

    document.querySelector(".custom-shift-select .select-options")
        .classList.add("select-hide");
    document.querySelector(".custom-shift-select .select-selected")
        .classList.remove("select-arrow-active");
}


function createShift(evt) {
    evt.preventDefault();

    let xhr = new XMLHttpRequest();
    xhr.responseType = "json";
    let fd = new FormData(evt.target); // evt.target is the form

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


function getSelectedShift() {
    return document.querySelector(".custom-shift-select select")
        .selectedOptions[0].value;
}


function concatDateShift(d, s) {
    let day, month, year, dateShift;
    day = d.firstChild.textContent;
    if (day.length < 2) { day = '0' + day; }
    month = MONTH_TO_NUM[document.querySelector(".calendar-month").innerHTML];
    year = "2021";  // TODO: get user requested year

    dateShift = `${year}-${month}-${day}_${s}`;
    return dateShift;
} 


function addPendingShiftToCalendar(e) {
    let shift = getSelectedShift();
    if (shift !== -1) {
        let event = document.createElement("DIV");
        event.setAttribute("class", "event pending");
        event.innerHTML = shift;
        this.appendChild(event);
        pendingShifts.push(concatDateShift(this, shift));
    } else {
        alert("No Shift is selected!");
    }
}


function confirmPendingShifts() {
    let xhr = new XMLHttpRequest();

    xhr.onload = function() {
        pendingShifts = [];
        for (let date in document.querySelectorAll(".pending")) {
            date.classList.remove("pending");
        }
    }

    xhr.open("POST", ADD_SHIFT_ENDPOINT);
    xhr.send(pendingShifts);
}