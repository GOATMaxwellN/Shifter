"use strict";


const GET_SHIFTS_ENDPOINT = "http://127.0.0.1:5000/api/get-shifts";
const CREATE_SHIFT_ENDPOINT = "http://127.0.0.1:5000/api/create-shift";
const DELETE_SHIFT_ENDPOINT = "http://127.0.0.1:5000/api/delete-shift";

document.addEventListener("click", closeSelect);
document.querySelector(".create-shift-btn").addEventListener("click", showCreateShiftView);
document.querySelector("#create-shift-form").addEventListener("submit", createShift);

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
    delBtn.addEventListener("click", deleteShift);

    opt.appendChild(p); opt.appendChild(delBtn);
    return opt;
}


function updateSelElmnt(e) {
    // If this bubbled up from delete btn, return
    if (e.target.classList.contains("icon-trash-empty")) { return; }

    let selElmnt, optsList;
    selElmnt = document.querySelector(".custom-shift-select .select-selected");
    selElmnt.innerHTML = this.firstElementChild.innerHTML;
    optsList = this.parentElement.children;

    // Undarkens the previous selected element in the options list
    for (let i = 0; i < optsList.length; i++) {
        if (optsList[i].classList.contains("select-selected-option")) {
            optsList[i].classList.remove("select-selected-option");
            break;
        }
    }
    // Darkens the new selected element
    this.classList.add("select-selected-option");
}


function deleteShift(e) {
    let shiftName, ogSel, selOpt, cusOpt;
    shiftName = this.previousElementSibling.innerHTML;
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

    let sel = document.querySelector(".custom-shift-select .select-options");
    sel.classList.add("select-hide");
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
