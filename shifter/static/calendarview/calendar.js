"use strict";


window.addEventListener("DOMContentLoaded", getConnectedCalendar)


function getConnectedCalendar() {
    let cal = document.querySelector(".calendar").getAttribute("id");
    if (cal === "google") {
        googleListEvents(startOfMonth(), endOfMonth());
    } else if (cal === "outlook") {
        // TODO: something for outlook
    }
}   


function drawCalendar(events) {
    let daysInMonth = getDaysInMonth();
    let firstWeekday = displayedYearAndMonth.getDay();
    let monthName = displayedYearAndMonth.toLocaleDateString("en-US", { month: 'long' });
    let calendar = document.getElementsByClassName("calendar")[0];
    let html = `
        <div class="calendar-month">${monthName}</div>
        <div class="calendar-names-of-days">${NAMES_OF_DAYS}</div>`;
    if (firstWeekday !== 0) {
        for (let i = 0; i < firstWeekday; i++) {
            html += "<div class='no-date'></div>";
        }
    }
    // Draw each date box
    for (let i = 1; i <= daysInMonth; i++) {
        html += `<div id="day${i}" class="calendar-date">${i}</div>`;
    }
    calendar.innerHTML = html;
    // Populate the date boxes with events in them
    events.forEach(function (v, i, a) {
        let start;
        let dateBox;
        if ("dateTime" in v["start"]) {
            start = new Date(v["start"]["dateTime"]);
        } else {
            start = new Date(v["start"]["date"] + "T00:00:00" + OFFSET);
        }
        dateBox = document.getElementById("day" + start.getDate());
        dateBox.innerHTML += `<div class="event">${v.summary}</div>`
    });
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
    googleListEvents(min, max);
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
    googleListEvents(min, max);
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


function googleListEvents(min, max) {
    let req = new XMLHttpRequest();
    req.responseType = "json";
    req.onload = function () {
        let events = this.response;
        drawCalendar(events);
    }
    let url = GOOGLE_LIST_EVENTS_ENDPOINT
        + `?timeMin=${min}&timeMax=${max}&timeZone=${TIMEZONE}`;
    req.open("GET", url);
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


const GOOGLE_LIST_EVENTS_ENDPOINT = "http://127.0.0.1:5000/api/google-list-events";
const TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const OFFSET = getTimeZoneOffset();
const NAMES_OF_DAYS = `
    <span>Sunday</span>
    <span>Monday</span>
    <span>Tuesday</span>
    <span>Wednesday</span>
    <span>Thursday</span>
    <span>Friday</span>
    <span>Saturday</span>
`;

let displayedYearAndMonth = new Date();
displayedYearAndMonth.setDate(1);
