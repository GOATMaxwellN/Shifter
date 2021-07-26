"use strict";
import { deleteShift } from "./shifts.js";

// === Custom dropdown menu (select) for selecting Shifts ===
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
