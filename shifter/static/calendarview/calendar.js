"use strict";
import { drawCustomCalendarSelect } from "./customElems.js";
import { getSelectedShift, concatDateShift } from "./shifts.js";

// === Constants
const GOOGLE_LIST_EVENTS_ENDPOINT = "http://127.0.0.1:5000/api/google-list-events";
const GOOGLE_LIST_CALENDARS = "http://127.0.0.1:5000/api/google-list-calendars";
const GOOGLE_ADD_SHIFT = "http://127.0.0.1:5000/api/google-add-shift";
const TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
export const OFFSET = getTimeZoneOffset();
const NAMES_OF_DAYS = `
    <span>Sunday</span>
    <span>Monday</span>
    <span>Tuesday</span>
    <span>Wednesday</span>
    <span>Thursday</span>
    <span>Friday</span>
    <span>Saturday</span>
`;
const CONFIRM_BTN = document.querySelector(".confirm-btn");
CONFIRM_BTN.addEventListener("click", confirmPendingShifts);

let calendars;  // Most calendar services allow one account to have several calendars
let calendarVendor;
let selectedCalendar;

let pendingShifts = [];
let displayedYearAndMonth = new Date();
displayedYearAndMonth.setDate(1);

getConnectedCalendar();


function getConnectedCalendar() {
    let cal = document.querySelector(".calendar").getAttribute("id");
    if (cal === "google") {
        calendarVendor = "google";
        selectedCalendar = "primary";
        googleListEvents(startOfMonth(), endOfMonth(), selectedCalendar);
        googleListCalendars();
    } else if (cal === "outlook") {
        // TODO: something for outlook
    }
}


function addCalendars(cals) {
    calendars = cals;
    let calsSel = document.querySelector(".custom-select-calendars select");
    for (let cal in calendars) {
        if (cal === "primary") { continue; }

        let opt = document.createElement("OPTION");
        // Will show name of the calendar
        opt.innerHTML = cal;
        /* Will hold id of the calendar in value attribute. If 
        calendar is the primary calendar, id can be just 'primary' */
        if (calendars.primary === cal) {
            opt.setAttribute("value", "primary");
        } else {
            opt.setAttribute("value", calendars[cal]);
        }
        calsSel.append(opt);
    }
    drawCustomCalendarSelect();
}


function showHideSpinner() {
    document.querySelector(".spinner-overlay")
        .classList.toggle("hide");
}


function drawCalendar(events) {

    function clearCalendar() {
        while (calendar.firstChild) {
            calendar.removeChild(calendar.lastChild);
        }
    }

    function createMonthBox(monthName) {
        let monthBox = document.createElement("DIV");
        monthBox.setAttribute("class", "calendar-month");
        monthBox.insertAdjacentText("afterbegin", monthName);
        return monthBox;
    }

    function createWeekBox() {
        let weekBox = document.createElement("DIV");
        weekBox.setAttribute("class", "calendar-names-of-days");
        weekBox.insertAdjacentHTML("afterbegin", NAMES_OF_DAYS);
        return weekBox;
    }

    function createDateBox(dateNum, noDate = false) {
        let dateBox = document.createElement("DIV");
        if (!noDate) {
            dateBox.setAttribute("id", "day-" + dateNum);
            dateBox.setAttribute("class", "calendar-date");
            dateBox.insertAdjacentText("afterbegin", dateNum);
            dateBox.addEventListener("click", addPendingShift);
        } else {
            dateBox.setAttribute("class", "no-date");
        }
        return dateBox;
    }

    let daysInMonth = getDaysInMonth();
    let firstWeekday = displayedYearAndMonth.getDay();
    let monthName = displayedYearAndMonth.toLocaleDateString("en-US", { month: 'short' });
    let calendar = document.querySelector(".calendar");
    let calendarFrag = new DocumentFragment();
    clearCalendar();

    // Initialize with month name and weekdays
    calendarFrag.append(createMonthBox(monthName), createWeekBox());
    // Offset the 1st of the month to the correct weekday
    if (firstWeekday !== 0) {
        for (let i = 0; i < firstWeekday; i++) {
            calendarFrag.append(createDateBox(0, true));
        }
    }
    // Draw each date box
    for (let i = 1; i <= daysInMonth; i++) {
        calendarFrag.append(createDateBox(i));
    }
    calendar.appendChild(calendarFrag);

    // Populate the date boxes with events in them
    events.forEach(function (v, i, a) {
        let start, dateBox;
        if ("dateTime" in v["start"]) {
            start = new Date(v["start"]["dateTime"]);
        } else {
            start = new Date(v["start"]["date"] + "T00:00:00" + OFFSET);
        }
        dateBox = document.getElementById("day-" + start.getDate());
        dateBox.innerHTML += `<div class="event">${v.summary}</div>`;
    });

    showHideSpinner()  // Removes spinner animation
}


export function switchCalendar(e) {
    if (calendarVendor == "google") {
        selectedCalendar = calendars[e.target.getAttribute("value")];
        googleListEvents(startOfMonth(), endOfMonth(), selectedCalendar);
    }
}


function nextMonth() {
    let month = displayedYearAndMonth.getMonth();
    let year = displayedYearAndMonth.getFullYear();
    if (month !== 11) {
        ++month;
        displayedYearAndMonth.setMonth(month);
    } else {
        month = 0;
        ++year;
        displayedYearAndMonth.setFullYear(year, month);
    }

    let min = startOfMonth(), max = endOfMonth();

    if (calendarVendor === "google") {
        googleListEvents(min, max, selectedCalendar);
    }
}


function previousMonth() {
    let month = displayedYearAndMonth.getMonth();
    let year = displayedYearAndMonth.getFullYear();
    if (month !== 0) {
        --month;
        displayedYearAndMonth.setMonth(month);
    } else {
        month = 11;
        --year;
        displayedYearAndMonth.setFullYear(year, month);
    }

    let min = startOfMonth(), max = endOfMonth();

    if (calendarVendor === "google") {
        googleListEvents(min, max, selectedCalendar);
    }
}


function startOfMonth() {
    return new Date(
        displayedYearAndMonth.getFullYear(),
        displayedYearAndMonth.getMonth(),
        1,
        0, 0, 0
    ).toISOString();
}


function endOfMonth() {
    return new Date(
        displayedYearAndMonth.getFullYear(),
        displayedYearAndMonth.getMonth(),
        getDaysInMonth(),
        23, 59, 59
    ).toISOString();
}


function getDaysInMonth() {
    return new Date(
        displayedYearAndMonth.getFullYear(),
        displayedYearAndMonth.getMonth() + 1, 0
    ).getDate();
}


function googleListEvents(min, max, calendarId) {
    showHideSpinner();  // Show spinner animation on top of calendar

    let req = new XMLHttpRequest();
    let url = new URL(GOOGLE_LIST_EVENTS_ENDPOINT);
    url.searchParams.append("timeMin", min);
    url.searchParams.append("timeMax", max);
    url.searchParams.append("timeZone", TIMEZONE);
    url.searchParams.append("calendarId", calendarId);

    req.responseType = "json";
    req.onload = function () {
        drawCalendar(this.response);
    }

    req.open("GET", url);
    req.send();
}


function googleListCalendars() {
    let req = new XMLHttpRequest();
    req.responseType = "json";

    // If succesful, add calendars to CALENDARS constant
    req.onload = function() {
        addCalendars(this.response);
    }

    req.open("GET", GOOGLE_LIST_CALENDARS);
    req.send();
}


function getTimeZoneOffset() {
    let offset = new Date().getTimezoneOffset() / 60;
    let sign;
    if (offset > 0) { sign = "-" } else { sign = "+" }

    // Insert a 0 in front of hour if hour is single digit
    if (offset < 10 && offset > -10) {
        // Special cases for offsets that have 30 or 45 in their minute field
        if (Math.abs(offset) % 1 == 0.5) {
            return sign + `0${Math.abs(Math.trunc(offset))}:30`;
        } else if (Math.abs(offset) % 1 == 0.75) {
            return sign + `0${Math.abs(Math.trunc(offset))}:45`;
        }
        return sign + `0${Math.abs(offset)}:00`;
    }

    // Special cases for offsets that have 30 or 45 in their minute field
    if (Math.abs(offset) % 1 == 0.5) {
        return sign + `${Math.abs(Math.trunc(offset))}:30`;
    } else if (Math.abs(offset) % 1 == 0.75) {
        return sign + `${Math.abs(Math.trunc(offset))}:45`;
    }
    return sign + `${Math.abs(offset)}:00`;
}

// === Adding shifts to the calendar
function addPendingShift(e) {
    let shift = getSelectedShift();
    if (shift != '-1') {
        if (pendingShifts.length === 0) { CONFIRM_BTN.disabled = false; }

        let dayNum = this.getAttribute("id").split("-")[1];
        pendingShifts.push(concatDateShift(dayNum, shift));

        let shiftEvent = document.createElement("DIV");
        shiftEvent.setAttribute("class", "event pending");
        shiftEvent.insertAdjacentText("afterbegin", shift);
        this.appendChild(shiftEvent);
    } else {
        alert("No Shift is selected!");
    }
}


function confirmPendingShifts() {
    CONFIRM_BTN.disabled = true;
    showHideSpinner();

    let xhr = new XMLHttpRequest();
    xhr.responseType = "json";
    let fd = new FormData();
    fd.set("dateShifts", JSON.stringify(pendingShifts));
    fd.set("calendarId", selectedCalendar)

    xhr.onload = function() {
        showHideSpinner();
        if (this.response["success"] == "complete") {
            // All Shifts were added successfully
            pendingShifts = [];
            // Removes pending animation
            for (let s of document.querySelectorAll(".pending")) {
                s.classList.remove("pending");
            }
        } else {
            // TODO: Some Shifts couldn't be added
        }
    }

    xhr.open("POST", GOOGLE_ADD_SHIFT);
    xhr.send(fd);
}

