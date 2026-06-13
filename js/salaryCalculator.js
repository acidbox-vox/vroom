// ========================================
// salaryCalculator.js
// เงินเดือนเฉลี่ย 60 เดือน
// 2 โหมด
//
// 1. กรอกเอง
// 2. 10 งวด × 6 เดือน
// ========================================

// ----------------------------------------
// แปลงเดือนเป็นภาษาไทย
// ----------------------------------------

const THAI_MONTHS = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค."
];

// ----------------------------------------
// สร้างงวดย้อนหลัง รวม 60 เดือน
// แบ่งตามครึ่งปีงบประมาณ
// (เม.ย.-ก.ย. และ ต.ค.-มี.ค.)
//
// ตัวอย่าง
//
// วันออก 1 พ.ย.2569
// (วันออกไม่นับ -> ทำงานถึง 31 ต.ค.2569)
//
// 1 ต.ค.69 - 30 ต.ค.69 (1 เดือน)  <- งวดเศษ
// 1 เม.ย.69 - 30 ก.ย.69 (6 เดือน)
// 1 ต.ค.68 - 31 มี.ค.69 (6 เดือน)
// ...
// รวมให้ครบ 60 เดือน
//
// ถ้างวดเศษแรกมี 0 เดือน
// (วันออกตรงกับวันที่ 1 ของ เม.ย./ต.ค. พอดี)
// ให้ข้ามงวดเศษนั้นไปเลย
// ----------------------------------------

// แปลง Date เป็น label วันที่ไทย เช่น "1 ต.ค.69"

function formatPeriodDate(date) {

    const yearBE2 =
        String(
            (date.getFullYear() + 543) % 100
        ).padStart(2, "0");

    return `${date.getDate()} ${THAI_MONTHS[date.getMonth()]}${yearBE2}`;

}

// คำนวณจำนวนเดือนแบบรวม (ปี*12+เดือน)
// ของวันที่ d (ใช้เทียบครึ่งปีงบประมาณ)

function monthsBetween(start, end) {

    return (
        (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth())
    );

}

function generatePeriods() {

    const endDateInput =
        document.getElementById(
            "endDate"
        ).value;

    if (!endDateInput) {

        alert(
            "กรุณาเลือกวันออกจากราชการก่อน"
        );

        return;

    }

    const container =
        document.getElementById(
            "salaryPeriods"
        );

    container.innerHTML = "";

    // วันออก (parse ผ่าน parseThaiDate
    // เพื่อรองรับทั้ง yyyy-mm-dd และ dd/mm/yyyy)

    const endDateRaw =
        parseThaiDate(endDateInput);

    if (!endDateRaw) {

        alert(
            "รูปแบบวันที่ไม่ถูกต้อง"
        );

        return;

    }

    // วันออกไม่นับ -> วันสุดท้ายที่ทำงาน

    const lastWorkDay =
        new Date(endDateRaw);

    lastWorkDay.setDate(
        lastWorkDay.getDate() - 1
    );

    // หาจุดเริ่มต้นครึ่งปีงบประมาณ
    // ที่ lastWorkDay อยู่ใน (1 เม.ย. หรือ 1 ต.ค.)

    const month =
        lastWorkDay.getMonth(); // 0-11

    let halfStart;

    if (month >= 3 && month <= 8) {

        // เม.ย.(3) - ก.ย.(8)

        halfStart =
            new Date(
                lastWorkDay.getFullYear(),
                3,
                1
            );

    }
    else if (month >= 9) {

        // ต.ค.(9) - ธ.ค.(11)

        halfStart =
            new Date(
                lastWorkDay.getFullYear(),
                9,
                1
            );

    }
    else {

        // ม.ค.(0) - มี.ค.(2)
        // อยู่ในครึ่งปีงบที่เริ่ม ต.ค. ปีก่อน

        halfStart =
            new Date(
                lastWorkDay.getFullYear() - 1,
                9,
                1
            );

    }

    // จำนวนเดือนของงวดเศษแรก
    // (จาก halfStart ถึง lastWorkDay รวมทั้งสองด้าน)

    const firstSpanMonths =
        monthsBetween(halfStart, lastWorkDay) + 1;

    let remaining = 60;

    let periodEnd =
        new Date(lastWorkDay);

    // ถ้างวดเศษแรกไม่ใช่ 6 เดือนเต็ม (0 < เดือน < 6)
    // ให้สร้างงวดเศษก่อน

    if (
        firstSpanMonths > 0 &&
        firstSpanMonths < 6
    ) {

        const periodStart =
            new Date(halfStart);

        addPeriodRow(
            container,
            periodStart,
            periodEnd,
            firstSpanMonths
        );

        remaining -= firstSpanMonths;

        // จุดสิ้นสุดของงวดถัดไป
        // คือวันก่อนหน้า periodStart

        periodEnd =
            new Date(periodStart);

        periodEnd.setDate(
            periodEnd.getDate() - 1
        );

    }
    // ถ้า firstSpanMonths === 0
    // (วันออกตรงวันที่ 1 ของ เม.ย./ต.ค. พอดี)
    // ข้ามงวดเศษ ไม่ต้องทำอะไร
    // periodEnd ยังคงเป็น lastWorkDay

    // สร้างงวดละ 6 เดือนเต็ม ไล่ย้อนหลัง
    // จนครบ 60 เดือน

    while (remaining > 0) {

        const span =
            Math.min(6, remaining);

        const periodStart =
            new Date(periodEnd);

        // ย้อนกลับ (span - 1) เดือน
        // เพื่อหาวันต้นงวด (วันที่ 1)

        periodStart.setMonth(
            periodStart.getMonth() - (span - 1)
        );

        periodStart.setDate(1);

        addPeriodRow(
            container,
            periodStart,
            periodEnd,
            span
        );

        remaining -= span;

        // จุดสิ้นสุดของงวดถัดไป

        periodEnd =
            new Date(periodStart);

        periodEnd.setDate(
            periodEnd.getDate() - 1
        );

    }

    attachSalaryEvents();

    calculateAverage60Months();

}

// ----------------------------------------
// เพิ่มแถวงวด
// ----------------------------------------

let periodIndex = 0;

function addPeriodRow(container, start, end, span) {

    periodIndex++;

    const label =
        `${formatPeriodDate(start)} - ${formatPeriodDate(end)}`;

    const row =
        document.createElement(
            "div"
        );

    row.className =
        "period-row";

    row.innerHTML = `

        <input
            type="text"
            value="${label}"
            readonly>

        <input
            type="number"
            class="salary-input"
            data-index="${periodIndex}"
            placeholder="เงินเดือน">

        <input
            type="number"
            class="month-input"
            value="${span}"
            readonly>

    `;

    container.appendChild(
        row
    );

}

// ----------------------------------------
// ผูก Event
// ----------------------------------------

function attachSalaryEvents() {

    const salaryInputs =
        document.querySelectorAll(
            ".salary-input"
        );

    salaryInputs.forEach(input => {

        input.addEventListener(
            "input",
            () => {

                calculateAverage60Months();

                if (
                    typeof calculate ===
                    "function"
                ) {

                    calculate();

                }

            }
        );

    });

}

// ----------------------------------------
// คำนวณเฉลี่ย 60 เดือน
//
// SUM(
// เงินเดือน × เดือน
// )
//
// ÷
//
// SUM(เดือน)
//
// ----------------------------------------

function calculateAverage60Months() {

    const salaries =
        document.querySelectorAll(
            ".salary-input"
        );

    const months =
        document.querySelectorAll(
            ".month-input"
        );

    let totalMoney = 0;

    let totalMonth = 0;

    salaries.forEach(
        (salaryInput,index) => {

        const salary =

            parseFloat(
                salaryInput.value
            ) || 0;

        const month =

            parseFloat(
                months[index].value
            ) || 0;

        totalMoney +=
            salary * month;

        totalMonth +=
            month;

    });

    let average = 0;

    if (totalMonth > 0) {

        average =
            totalMoney /
            totalMonth;

    }

    const avgDisplay =
        document.getElementById(
            "avgSalaryDisplay"
        );

    if (avgDisplay) {

        avgDisplay.innerText =

            formatMoney(
                average
            ) +

            " บาท";

    }

    return average;

}

// ----------------------------------------
// อ่านค่าเฉลี่ย
// ----------------------------------------

function getAverageSalary() {

    const mode =

        document.querySelector(
            'input[name="avgMode"]:checked'
        ).value;

    // --------------------
    // กรอกเอง
    // --------------------

    if (
        mode === "manual"
    ) {

        return parseFloat(

            document.getElementById(
                "avgSalary"
            ).value

        ) || 0;

    }

    // --------------------
    // 10 งวด
    // --------------------

    return calculateAverage60Months();

}

// ----------------------------------------
// สลับโหมด
// ----------------------------------------

function toggleAverageMode() {

    const mode =

        document.querySelector(
            'input[name="avgMode"]:checked'
        ).value;

    const manualSection =

        document.getElementById(
            "manualSection"
        );

    const historySection =

        document.getElementById(
            "historySection"
        );

    if (
        mode === "manual"
    ) {

        manualSection.style.display =
            "block";

        historySection.style.display =
            "none";

    }
    else {

        manualSection.style.display =
            "none";

        historySection.style.display =
            "block";

    }

}

// ----------------------------------------
// จัดรูปแบบเงิน
// ----------------------------------------

function formatMoney(value) {

    return Number(
        value || 0
    ).toLocaleString(
        "th-TH",
        {
            minimumFractionDigits:2,
            maximumFractionDigits:2
        }
    );

}