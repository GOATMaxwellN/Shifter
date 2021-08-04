"use strict";
import { drawCustomCalendarSelect } from "./customElems.js";
import { getSelectedShift, concatDateShift } from "./shifts.js";


// Class that is instantiated when user is viewing their google calendar
class GoogleCalendar {
    // Endpoints used
    LIST_EVENTS_ENDPOINT = "http://127.0.0.1:5000/api/google-list-events";
    LIST_CALENDARS_ENDPOINT = "http://127.0.0.1:5000/api/google-list-calendars";
    ADD_SHIFTS_ENDPOINT = "http://127.0.0.1:5000/api/google-add-shift";

    calendars = {primary: "primary"};
    selectedCalendar = "primary";

    /* Saves the last request made in this.drawEvents(). Useful for 
    when user is quickly switching between months and I need to abort
    the request in process */
    curDrawEventsReq = new XMLHttpRequest();

    constructor() {
        /* Draws the calendar, which in turn calls this.drawEvents
        to place existing events on the calendar. */
        this.drawCalendar();

        /* Set this.calendars to an object containing all the user's
        calendars and draw a dropdown menu to allow user to switch
        between calendars */
        this.getCalendars();
    }

    /* This just calls the global drawCalendar() that has 'this'
    binded to an instance of this class */
    drawCalendar() {
        drawCalendar.call(this);
    }

    /* Get events from user's Google Calendar and 
    draw them on the calendar. */
    drawEvents(calendarDiv) {
        /* If user is switching between months quickly, this will abort
        the last request which is most likely in progress. Most of
        the time this will do nothing. */
        this.curDrawEventsReq.abort();

        let calendarId = this.calendars[this.selectedCalendar];
        this.curDrawEventsReq = new XMLHttpRequest();
        let url = new URL(this.LIST_EVENTS_ENDPOINT);
        url.searchParams.append("timeMin", startOfMonth());
        url.searchParams.append("timeMax", endOfMonth());
        url.searchParams.append("timeZone", TIMEZONE);
        url.searchParams.append("calendarId", calendarId);

        this.curDrawEventsReq.responseType = "json";

        // Place the events in the proper date box on the calendar
        this.curDrawEventsReq.onload = function () {
            let events = this.response;
            events.forEach(function (v, i, a) {
                let start, dateBox;
                if ("dateTime" in v["start"]) {
                    start = new Date(v["start"]["dateTime"]);
                } else {
                    start = new Date(v["start"]["date"] + "T00:00:00" + OFFSET);
                }
                dateBox = calendarDiv.querySelector("#day-" + start.getDate());
                dateBox.innerHTML += `<div class="event">${v.summary}</div>`;
            });
            hideSpinner() // Hides the spinner animation
        }

        this.curDrawEventsReq.open("GET", url);
        this.curDrawEventsReq.send();
    }

    getCalendars() {
        let that = this;
        let req = new XMLHttpRequest();
        req.responseType = "json";

        /* If succesful, set this.calendars to the response
        and draw the calendars dropdown menu */
        req.onload = function () {
            //addCalendars(this.response);
            that.calendars = this.response;
            drawCustomCalendarSelect.call(that, that.calendars);
        }

        req.open("GET", this.LIST_CALENDARS_ENDPOINT);
        req.send();
    }

    /* Event handler for when a calendar is selected from the dropdown
    menu. The 'this' object will still refer to an instance of this class,
    because it was binded when setting the event listener. */
    switchCalendar(e) {
        this.selectedCalendar = e.currentTarget.getAttribute("value");
        this.drawCalendar();
    }

    /* Called by confirmPendingShifts() when user decides to add their
    'pending' Shifts to their calendar. */
    addShifts() {
        let xhr = new XMLHttpRequest();
        xhr.responseType = "json";
        let fd = new FormData();
        fd.set("dateShifts", JSON.stringify(pendingShifts));
        fd.set("calendarId", this.calendars[this.selectedCalendar]);

        xhr.onload = function () {
            hideSpinner();
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

        xhr.open("POST", this.ADD_SHIFTS_ENDPOINT);
        xhr.send(fd);
    }
}


// Class that is instantiated when user is viewing their outlook calendar
// TODO: yet to be implemented
class OutlookCalendar {

    constructor() {
        this.drawCalendar();
    }
    
    drawCalendar() {
        drawCalendar.call(this);
    }
    
    drawEvents() {}

    addShifts() {}
}


// === Constants
const TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
export const OFFSET = getTimeZoneOffset();

// Used when drawing the calendar
const NAMES_OF_DAYS = `
    <span>Sunday</span>
    <span>Monday</span>
    <span>Tuesday</span>
    <span>Wednesday</span>
    <span>Thursday</span>
    <span>Friday</span>
    <span>Saturday</span>
`;

// Button that adds their 'pending' Shifts to their calendar
const CONFIRM_BTN = document.querySelector(".confirm-btn");
CONFIRM_BTN.addEventListener("click", confirmPendingShifts);

// Holds the current Calendar instance to use
let calendar;
// Holds the pending Shifts for confirmation
let pendingShifts = [];

let displayedYearAndMonth = new Date();
displayedYearAndMonth.setDate(1);


function getConnectedCalendar() {
    let cal = document.querySelector(".calendar").getAttribute("id");
    if (cal === "google") {
        calendar = new GoogleCalendar();
    } else if (cal === "outlook") {
        calendar = new OutlookCalendar();
    }
}


// Shows or hides the loading animation on the calendar
function showSpinner() {
    document.querySelector(".spinner-overlay")
        .classList.remove("hide");
}

function hideSpinner() {
    document.querySelector(".spinner-overlay")
        .classList.add("hide");
}



/* Called by a Calendar instance when they want
to (re)draw thecalendar */
function drawCalendar() {

    function clearCalendar() {
        while (calendarDiv.firstChild) {
            calendarDiv.removeChild(calendarDiv.lastChild);
        }
    }

    function createMonthBox() {
        let monthBox = document.createElement("DIV");
        monthBox.setAttribute("class", "calendar-month");
        monthBox.setAttribute("value", monthName);
        monthBox.insertAdjacentText("afterbegin", monthName + ' ' + year);
        
        /* Also add the previous & next month buttons to
        navigate between month */
        let pMonth = document.createElement("BUTTON");
        pMonth.innerHTML = "<-- Previous month";
        pMonth.addEventListener("click", previousMonth);
        pMonth.setAttribute("class", "month-nav-btn prev");
        let nMonth = document.createElement("BUTTON");
        nMonth.innerHTML = "Next month -->";
        nMonth.setAttribute("class", "month-nav-btn next");
        nMonth.addEventListener("click", nextMonth);

        monthBox.appendChild(pMonth); monthBox.appendChild(nMonth);
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
    let year = displayedYearAndMonth.getFullYear();
    let calendarDiv = document.querySelector(".calendar");
    let calendarFrag = new DocumentFragment();
    clearCalendar();
    showSpinner();  // Show spinner animation

    // Initialize with month name and weekdays
    calendarFrag.append(createMonthBox(), createWeekBox());
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
    calendarDiv.appendChild(calendarFrag);

    // Get and draw events with user's calendar
    // Will also hide the spinner animation when done
    this.drawEvents(calendarDiv);
}


// View the next month in the user's calendar
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

    calendar.drawCalendar();
}


// View the previous month in the user's calendar
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

    calendar.drawCalendar();
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


/* Visually adds the pending Shift to the calendar and
pushes it to the pendingShifts array */
function addPendingShift(e) {
    let shift = getSelectedShift();
    if (shift != '-1') {
        if (pendingShifts.length === 0) { CONFIRM_BTN.disabled = false; }

        let dayNum = this.getAttribute("id").split("-")[1];
        pendingShifts.push(concatDateShift(dayNum, shift));
        console.log(pendingShifts);

        let shiftEvent = document.createElement("DIV");
        shiftEvent.setAttribute("class", "event pending");
        shiftEvent.insertAdjacentText("afterbegin", shift);
        this.appendChild(shiftEvent);
    } else {
        alert("No Shift is selected!");
    }
}


// Uses Calendar instance to add the Shifts to the actual calendar
function confirmPendingShifts() {
    CONFIRM_BTN.disabled = true;
    showSpinner();

    calendar.addShifts();
}


/* Gets which calendar to show the user first */
getConnectedCalendar();