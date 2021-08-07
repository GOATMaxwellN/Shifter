"use strict";
import { showAllCalendarsModal } from "./calendar.js";
import { deleteShift } from "./shifts.js";

// === CUSTOM DROPDOWN MENU (SELECT) FOR SELECTING SHIFTS ===
export function drawCustomShiftSelect() {
    let ogSel, selCont, selElmnt
    /* Get underlying <select> which contains Shift names and <div>
    container where our custom select will be made */
    ogSel = ogSel = document.querySelector(".custom-shift-select select");
    selCont = document.querySelector(".custom-shift-select");
    /* Element that will show the selected option and open/close
    our custom select */
    selElmnt = document.createElement("DIV");
    selElmnt.setAttribute("class", "select-selected");
    selElmnt.innerHTML = ogSel.options[0].innerHTML;
    selCont.appendChild(selElmnt);

    // Create the options for our custom select
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
    selElmnt.addEventListener("click", function () {
        document.querySelector(".custom-shift-select .select-options")
            .classList.toggle("select-hide");
        this.classList.toggle("select-arrow-active");
    });
    // Hide opts when clicking outside the custom select
    document.addEventListener("click", closeSelect);
}


function createCustomOption(shiftName) {
    let opt, p, delBtn;
    opt = document.createElement("DIV");
    opt.setAttribute("class", "select-option");
    opt.addEventListener("click", updateSelElmnt)

    p = document.createElement("P");
    p.innerHTML = shiftName;

    delBtn = document.createElement("BUTTON");
    delBtn.innerHTML = "&#xe800;"
    delBtn.setAttribute("class", "icon-trash-empty");
    delBtn.setAttribute("data-shift", shiftName);
    delBtn.addEventListener("click", deleteShift);

    opt.appendChild(p); opt.appendChild(delBtn);
    return opt;
}


export function addShiftToCustomSelect(shiftName) {
    document.querySelector(".custom-shift-select .select-options")
        .appendChild(createCustomOption(shiftName));
}


function updateSelElmnt(e) {
    // If this bubbled up from delete btn, don't do anything
    if (e.target.classList.contains("icon-trash-empty")) { return; }

    let selElmnt, optsList, ogSel;
    // Update the selected element to the name of the clicked Shift
    selElmnt = document.querySelector(".custom-shift-select .select-selected");
    selElmnt.innerHTML = this.firstElementChild.innerHTML;

    optsList = this.parentElement;
    ogSel = document.querySelector(".custom-shift-select select");

    // Undarkens the previous selected element in the options list
    let prevSel = optsList.querySelector(".select-selected-option");
    if (prevSel !== null) { prevSel.classList.remove("select-selected-option"); }

    // Darkens the new selected element, and select it in the underlying select
    this.classList.add("select-selected-option");
    ogSel.selectedIndex = ogSel.namedItem(this.firstElementChild.innerHTML).index;
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
// =============


// ==== CUSTOM DROPDOWN MENU TO SELECT A CALENDAR ====
export function drawCustomCalendarSelect(calendars) {
    // Get underlying <select> with calendar names and our container
    // let ogSel = document.querySelector(".custom-select-calendars select");
    let selCont = document.querySelector(".custom-select-calendars");

    // Element that will open dropdown menu to select a calendar
    let openElem = document.createElement("DIV");
    openElem.setAttribute("class", "opener");
    openElem.innerHTML = "Switch calendars:";

    // Menu that holds the calendar names
    let calsList = document.createElement("DIV");
    calsList.setAttribute("class", "calendar-list hide");

    /* Iterate over passed in calendars object and 
    add the calendar to the dropdown menu */
    for (let calName in calendars) {
        /* Skip 'primary' property, it's only used to
        identify the name of the primary calendar */
        if (calName === "primary") { continue; }

        let calOpt = document.createElement("DIV");
        calOpt.innerHTML = calName;
        if (calendars["primary"] === calName) {
            calOpt.setAttribute("class", "calendar-option selected-calendar");
        } else {
            calOpt.setAttribute("class", "calendar-option");
        }
        calOpt.setAttribute("value", calName);
        // 'this' points to a *Calendar class in calendars.js
        calOpt.addEventListener("click", this.switchCalendar.bind(this));
        calOpt.addEventListener("click", highlightSelectedCalendar);
        calsList.appendChild(calOpt);
    }

    // Last option to allow user to look at all their connected calendars
    let calOpt = document.createElement("DIV");
    calOpt.innerHTML = "All calendars:";
    calOpt.setAttribute("class", "calendar-option all-calendars");
    calOpt.addEventListener("click", showAllCalendarsModal);
    calsList.appendChild(calOpt);

    // Allow openElem to toggle viewing of the calsList
    openElem.addEventListener("click", function() {
        calsList.classList.toggle("hide");
        this.classList.toggle("active");
    });

    // Any click aside from the opener should close calsList
    document.addEventListener("click", function(e) {
        if (e.target.classList.contains("opener")) { return; }
        calsList.classList.add("hide");
        document.querySelector(".custom-select-calendars .opener")
            .classList.remove("active");
    })
    
    selCont.appendChild(openElem);
    selCont.appendChild(calsList);
}


function highlightSelectedCalendar(e) {
    // Get currently highlighted calendar and unhighlight it
    this.parentElement.querySelector(".selected-calendar")
        .classList.remove("selected-calendar");

    // Highlight this calendar option
    this.classList.add("selected-calendar");
}
