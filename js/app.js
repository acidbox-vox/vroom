// ========================================
// app.js
// ========================================

document.addEventListener(
    "DOMContentLoaded",
    init
);

function init(){

    bindEvents();

    toggleAverageMode();

    calculate();

}

// ------------------------------------
// ผูก Event
// ------------------------------------

function bindEvents(){

    const ids = [

        "startDate",
        "endDate",

        "bonusYear",
        "bonusMonth",
        "bonusDay",

        "lastSalary",

        "avgSalary",

        "memberType"

    ];

    ids.forEach(id=>{

        const el =
        document.getElementById(id);

        if(el){

            el.addEventListener(
                "input",
                calculate
            );

            el.addEventListener(
                "change",
                calculate
            );

        }

    });

    // radio

    document
    .querySelectorAll(
        'input[name="avgMode"]'
    )
    .forEach(radio=>{

        radio.addEventListener(
            "change",
            ()=>{

                toggleAverageMode();

                calculate();

            }
        );

    });

    // สร้างงวด

    document
    .getElementById(
        "generateBtn"
    )
    .addEventListener(
        "click",
        generatePeriods
    );

    // ล้างข้อมูล

    document
    .getElementById(
        "clearBtn"
    )
    .addEventListener(
        "click",
        clearAll
    );

    // พิมพ์

    document
    .getElementById(
        "printBtn"
    )
    .addEventListener(
        "click",
        ()=>window.print()
    );

    // PDF

    document
    .getElementById(
        "pdfBtn"
    )
    .addEventListener(
        "click",
        ()=>{

            alert(
                "ใช้ Print → Save as PDF"
            );

        }
    );

}

// ------------------------------------
// คำนวณทั้งหมด
// ------------------------------------

function calculate(){

    const result =

        getTotalService();

    // อายุราชการ

    document
    .getElementById(
        "serviceResult"
    )
    .innerText =

        formatYMD(
            result.service
        );

    // รวมอายุราชการ

    document
    .getElementById(
        "totalServiceResult"
    )
    .innerText =

        formatYMD(
            result.total
        );

    // เวลาราชการ

    document
    .getElementById(
        "serviceDecimal"
    )
    .innerText =

        result.serviceDecimal
        .toFixed(2)

        + " ปี";

    // -----------------

    const lastSalary =

        parseFloat(

            document
            .getElementById(
                "lastSalary"
            )
            .value

        ) || 0;

    const avgSalary =

        getAverageSalary();

    document
    .getElementById(
        "avgSalaryDisplay"
    )
    .innerText =

        formatMoney(
            avgSalary
        )

        + " บาท";

    const memberType =

        document
        .getElementById(
            "memberType"
        )
        .value;

    // -----------------
    // บำเหน็จ
    // -----------------

    const gratuity =

        calculateGratuity(

            lastSalary,

            result.serviceDecimal

        );

    // -----------------
    // บำนาญ
    // -----------------

    let pension = 0;

    if(
        memberType ===
        "gpf"
    ){

        pension =

            calculatePensionGPF(

                avgSalary,

                result.serviceDecimal

            );

    }
    else{

        pension =

            calculatePensionNormal(

                lastSalary,

                result.serviceDecimal

            );

    }

    // -----------------
    // ดำรงชีพ
    // -----------------

    const livingGrant =

        calculateLivingGrant(
            pension
        );

    // -----------------
    // แสดงผล
    // -----------------

    document
    .getElementById(
        "gratuityResult"
    )
    .innerText =

        formatMoney(
            gratuity
        );

    document
    .getElementById(
        "pensionResult"
    )
    .innerText =

        formatMoney(
            pension
        );

    document
    .getElementById(
        "livingGrantResult"
    )
    .innerText =

        formatMoney(
            livingGrant
        );

}

// ------------------------------------
// ล้างข้อมูล
// ------------------------------------

function clearAll(){

    if(
        !confirm(
            "ล้างข้อมูลทั้งหมด ?"
        )
    ){
        return;
    }

    document
    .querySelectorAll(
        "input"
    )
    .forEach(input=>{

        if(
            input.type ===
            "radio"
        ){
            return;
        }

        input.value = "";

    });

    document
    .querySelector(
        'input[value="manual"]'
    )
    .checked = true;

    toggleAverageMode();

    document
    .getElementById(
        "salaryPeriods"
    )
    .innerHTML = "";

    calculate();

}