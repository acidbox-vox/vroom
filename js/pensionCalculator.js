// ========================================
// pensionCalculator.js
// ========================================

// บำเหน็จ

function calculateGratuity(
    lastSalary,
    serviceDecimal
){

    return (
        lastSalary *
        serviceDecimal
    );

}

// สมาชิก กบข.

function calculatePensionGPF(
    avgSalary,
    serviceDecimal
){

    let pension =

        (
            avgSalary *
            serviceDecimal
        )

        / 50;

    const maxPension =

        avgSalary * 0.70;

    if(
        pension >
        maxPension
    ){

        pension =
        maxPension;

    }

    return pension;

}

// ไม่เป็นสมาชิก

function calculatePensionNormal(
    lastSalary,
    serviceDecimal
){

    return (

        lastSalary *
        serviceDecimal

    ) / 50;

}

// บำเหน็จดำรงชีพ

function calculateLivingGrant(
    pension
){

    return Math.min(

        pension * 15,

        200000

    );

}