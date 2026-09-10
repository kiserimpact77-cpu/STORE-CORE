"use strict";

/* =========================================================
   STORE CORE
   Main JavaScript
========================================================= */


/* =========================================================
   CONFIGURATION
========================================================= */

const DB_NAME = "STORE_CORE_DB";
const DB_VERSION = 1;

const PRODUCTS_STORE = "products";
const SALES_STORE = "sales";
const REPORTS_STORE = "reports";

const BRIDGE_URL = "http://127.0.0.1:8765";

let db = null;

let currentPage = "sales";

let currentProductImage = null;
let currentSaleProduct = null;

let scannerConnected = false;
let scannerPolling = false;

const selectedReports = new Set();


/* =========================================================
   DOM ELEMENTS
========================================================= */

const sidebar = document.getElementById("sidebar");
const mobileMenuButton = document.getElementById("mobileMenuButton");

const navItems = document.querySelectorAll(".nav-item");
const pages = document.querySelectorAll("[data-page-content]");

const currentPageName = document.getElementById("currentPageName");


// Products
const addProductButton = document.getElementById("addProductButton");
const productForm = document.getElementById("productForm");

const productImagePreview =
    document.getElementById("productImagePreview");

const productImage =
    document.getElementById("productImage");

const productName =
    document.getElementById("productName");

const productPrice =
    document.getElementById("productPrice");

const productBarcode =
    document.getElementById("productBarcode");

const scanProductBarcodeButton =
    document.getElementById("scanProductBarcodeButton");

const productsCount =
    document.getElementById("productsCount");

const productsGrid =
    document.getElementById("productsGrid");


// Sales
const scannerStatus =
    document.getElementById("scannerStatus");

const connectScannerButton =
    document.getElementById("connectScannerButton");

const saleItemsCount =
    document.getElementById("saleItemsCount");

const saleProductPreview =
    document.getElementById("saleProductPreview");

const quantitySection =
    document.getElementById("quantitySection");

const saleQuantity =
    document.getElementById("saleQuantity");

const confirmSaleButton =
    document.getElementById("confirmSaleButton");

const saleTotal =
    document.getElementById("saleTotal");


// Reports
const totalSoldCount =
    document.getElementById("totalSoldCount");

const totalSalesValue =
    document.getElementById("totalSalesValue");

const reportSearch =
    document.getElementById("reportSearch");

const resetSelectedReportsButton =
    document.getElementById("resetSelectedReportsButton");

const reportsList =
    document.getElementById("reportsList");


// Connection
const connectionStatus =
    document.getElementById("connectionStatus");

const connectionButton =
    document.getElementById("connectionButton");


// Scanner Modal
const scannerModal =
    document.getElementById("scannerModal");

const scannerModalStatus =
    document.getElementById("scannerModalStatus");

const modalCloseButton =
    document.querySelector("[data-close-modal]");


// Notification
const notification =
    document.getElementById("notification");

const notificationMessage =
    document.getElementById("notificationMessage");


/* =========================================================
   PAGE TITLES
========================================================= */

const pageTitles = {
    sales: "البيع",
    products: "تسجيل المنتجات",
    reports: "التقارير",
    connection: "الربط",
    developer: "تواصل معنا / المطور"
};


/* =========================================================
   DATABASE
========================================================= */

function openDatabase() {

    return new Promise((resolve, reject) => {

        const request = indexedDB.open(
            DB_NAME,
            DB_VERSION
        );


        request.onupgradeneeded = function (event) {

            const database = event.target.result;


            /* Products */

            if (!database.objectStoreNames.contains(PRODUCTS_STORE)) {

                const productsStore =
                    database.createObjectStore(
                        PRODUCTS_STORE,
                        {
                            keyPath: "id",
                            autoIncrement: true
                        }
                    );

                productsStore.createIndex(
                    "barcode",
                    "barcode",
                    {
                        unique: true
                    }
                );

                productsStore.createIndex(
                    "name",
                    "name",
                    {
                        unique: false
                    }
                );
            }


            /* Sales */

            if (!database.objectStoreNames.contains(SALES_STORE)) {

                const salesStore =
                    database.createObjectStore(
                        SALES_STORE,
                        {
                            keyPath: "id",
                            autoIncrement: true
                        }
                    );

                salesStore.createIndex(
                    "productId",
                    "productId",
                    {
                        unique: false
                    }
                );

                salesStore.createIndex(
                    "barcode",
                    "barcode",
                    {
                        unique: false
                    }
                );
            }


            /* Reports */

            if (!database.objectStoreNames.contains(REPORTS_STORE)) {

                const reportsStore =
                    database.createObjectStore(
                        REPORTS_STORE,
                        {
                            keyPath: "id",
                            autoIncrement: true
                        }
                    );

                reportsStore.createIndex(
                    "productId",
                    "productId",
                    {
                        unique: true
                    }
                );

                reportsStore.createIndex(
                    "barcode",
                    "barcode",
                    {
                        unique: true
                    }
                );
            }
        };


        request.onsuccess = function (event) {

            db = event.target.result;

            resolve(db);
        };


        request.onerror = function () {

            reject(
                request.error ||
                new Error("فشل فتح قاعدة البيانات")
            );
        };

    });
}


/* =========================================================
   DATABASE HELPERS
========================================================= */

function databaseReady() {

    if (!db) {
        return Promise.reject(
            new Error("قاعدة البيانات غير جاهزة")
        );
    }

    return Promise.resolve(db);
}


function dbRequest(request) {

    return new Promise((resolve, reject) => {

        request.onsuccess = function () {
            resolve(request.result);
        };

        request.onerror = function () {
            reject(request.error);
        };

    });
}


async function getAll(storeName) {

    await databaseReady();

    const transaction =
        db.transaction(
            storeName,
            "readonly"
        );

    const store =
        transaction.objectStore(storeName);

    return dbRequest(
        store.getAll()
    );
}


async function getById(storeName, id) {

    await databaseReady();

    const transaction =
        db.transaction(
            storeName,
            "readonly"
        );

    const store =
        transaction.objectStore(storeName);

    return dbRequest(
        store.get(id)
    );
}


async function addRecord(storeName, data) {

    await databaseReady();

    const transaction =
        db.transaction(
            storeName,
            "readwrite"
        );

    const store =
        transaction.objectStore(storeName);

    return dbRequest(
        store.add(data)
    );
}


async function putRecord(storeName, data) {

    await databaseReady();

    const transaction =
        db.transaction(
            storeName,
            "readwrite"
        );

    const store =
        transaction.objectStore(storeName);

    return dbRequest(
        store.put(data)
    );
}


async function deleteRecord(storeName, id) {

    await databaseReady();

    const transaction =
        db.transaction(
            storeName,
            "readwrite"
        );

    const store =
        transaction.objectStore(storeName);

    return dbRequest(
        store.delete(id)
    );
}


async function getByIndex(
    storeName,
    indexName,
    value
) {

    await databaseReady();

    const transaction =
        db.transaction(
            storeName,
            "readonly"
        );

    const store =
        transaction.objectStore(storeName);

    const index =
        store.index(indexName);

    return dbRequest(
        index.get(value)
    );
}


/* =========================================================
   UTILITY FUNCTIONS
========================================================= */

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function formatNumber(value) {

    return Number(value || 0)
        .toLocaleString("ar-EG");
}


function formatMoney(value) {

    return `${Number(value || 0).toLocaleString(
        "ar-EG",
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }
    )} جنيه`;
}


function showNotification(message) {

    if (!notification || !notificationMessage) {
        return;
    }

    notificationMessage.textContent = message;

    notification.hidden = false;

    clearTimeout(
        showNotification.timer
    );

    showNotification.timer =
        setTimeout(() => {

            notification.hidden = true;

        }, 3000);
}


function setScannerStatus(connected) {

    scannerConnected = connected;


    if (scannerStatus) {

        scannerStatus.textContent =
            connected
                ? "متصل"
                : "غير متصل";
    }


    if (connectionStatus) {

        connectionStatus.textContent =
            connected
                ? "متصل"
                : "غير متصل";
    }


    if (connectScannerButton) {

        connectScannerButton.textContent =
            connected
                ? "الهاتف متصل"
                : "توصيل الهاتف";
    }


    if (connectionButton) {

        connectionButton.textContent =
            connected
                ? "الهاتف متصل"
                : "توصيل الهاتف";
    }
}


/* =========================================================
   NAVIGATION
========================================================= */

function navigateTo(pageName) {

    const pageExists =
        document.querySelector(
            `[data-page-content="${pageName}"]`
        );

    if (!pageExists) {
        return;
    }


    currentPage = pageName;


    navItems.forEach(item => {

        item.classList.toggle(
            "active",
            item.dataset.page === pageName
        );

    });


    pages.forEach(page => {

        page.classList.toggle(
            "active-page",
            page.dataset.pageContent === pageName
        );

    });


    if (currentPageName) {

        currentPageName.textContent =
            pageTitles[pageName] ||
            pageName;
    }


    if (sidebar) {
        sidebar.classList.remove("open");
    }


    if (pageName === "sales") {

        openScannerModal(false);
    }


    if (pageName === "products") {
        renderProducts();
    }


    if (pageName === "reports") {
        renderReports();
    }

}


navItems.forEach(item => {

    item.addEventListener(
        "click",
        () => {

            navigateTo(
                item.dataset.page
            );

        }
    );

});


/* =========================================================
   MOBILE SIDEBAR
========================================================= */

if (mobileMenuButton) {

    mobileMenuButton.addEventListener(
        "click",
        () => {

            if (!sidebar) {
                return;
            }

            sidebar.classList.toggle("open");

        }
    );

}


/* =========================================================
   PRODUCT IMAGE
========================================================= */

if (productImage) {

    productImage.addEventListener(
        "change",
        function () {

            const file =
                this.files &&
                this.files[0];

            if (!file) {

                currentProductImage = null;

                if (productImagePreview) {

                    productImagePreview.innerHTML =
                        "<span>صورة المنتج</span>";
                }

                return;
            }


            currentProductImage = file;


            const imageURL =
                URL.createObjectURL(file);


            if (productImagePreview) {

                productImagePreview.innerHTML = `
                    <img
                        src="${imageURL}"
                        alt="صورة المنتج">
                `;
            }

        }
    );

}


/* =========================================================
   RESET PRODUCT FORM
========================================================= */

function resetProductForm() {

    if (productForm) {
        productForm.reset();
    }


    currentProductImage = null;


    if (productImagePreview) {

        productImagePreview.innerHTML =
            "<span>صورة المنتج</span>";
    }


    if (productBarcode) {
        productBarcode.value = "";
    }
}


/* =========================================================
   ADD PRODUCT BUTTON
========================================================= */

if (addProductButton) {

    addProductButton.addEventListener(
        "click",
        () => {

            resetProductForm();


            if (productForm) {

                productForm.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            }

        }
    );

}


/* =========================================================
   PRODUCT BARCODE SCANNING
========================================================= */

if (scanProductBarcodeButton) {

    scanProductBarcodeButton.addEventListener(
        "click",
        () => {

            openScannerModal(true);

        }
    );

}


/* =========================================================
   PRODUCT REGISTRATION
========================================================= */

if (productForm) {

    productForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const name =
                productName
                    ? productName.value.trim()
                    : "";


            const price =
                productPrice
                    ? Number(productPrice.value)
                    : 0;


            const barcode =
                productBarcode
                    ? productBarcode.value.trim()
                    : "";


            if (!name) {

                showNotification(
                    "اكتب اسم المنتج أولاً."
                );

                return;
            }


            if (!Number.isFinite(price) || price < 0) {

                showNotification(
                    "أدخل سعرًا صحيحًا."
                );

                return;
            }


            if (!barcode) {

                showNotification(
                    "يجب تسجيل Barcode المنتج."
                );

                return;
            }


            try {

                const existingProduct =
                    await getByIndex(
                        PRODUCTS_STORE,
                        "barcode",
                        barcode
                    );


                if (existingProduct) {

                    showNotification(
                        "هذا الـBarcode مسجل بالفعل لمنتج آخر."
                    );

                    return;
                }


                const product = {

                    name,
                    price,
                    barcode,

                    image:
                        currentProductImage || null,

                    createdAt:
                        new Date().toISOString()

                };


                const productId =
                    await addRecord(
                        PRODUCTS_STORE,
                        product
                    );


                const report = {

                    productId,
                    productName: name,
                    barcode,

                    totalQuantity: 0,
                    totalSales: 0,

                    createdAt:
                        new Date().toISOString()

                };


                await addRecord(
                    REPORTS_STORE,
                    report
                );


                showNotification(
                    "تم تسجيل المنتج بنجاح."
                );


                resetProductForm();

                await renderProducts();


                navigateTo("products");

            }
            catch (error) {

                console.error(
                    "Product registration error:",
                    error
                );


                if (
                    error &&
                    error.name === "ConstraintError"
                ) {

                    showNotification(
                        "هذا الـBarcode مسجل بالفعل."
                    );

                    return;
                }


                showNotification(
                    "حدث خطأ أثناء تسجيل المنتج."
                );

            }

        }
    );

}


/* =========================================================
   RENDER PRODUCTS
========================================================= */

async function renderProducts() {

    if (!productsGrid) {
        return;
    }


    try {

        const products =
            await getAll(
                PRODUCTS_STORE
            );


        if (productsCount) {

            productsCount.textContent =
                `${formatNumber(products.length)} منتج`;
        }


        if (!products.length) {

            productsGrid.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">▣</span>
                    <h4>لا توجد منتجات مسجلة</h4>
                    <p>
                        أضف أول منتج لتبدأ استخدام STORE CORE.
                    </p>
                </div>
            `;

            return;
        }


        productsGrid.innerHTML =
            products.map(product => {

                const imageHTML =
                    product.image
                        ? `
                            <img
                                src="${URL.createObjectURL(product.image)}"
                                alt="${escapeHTML(product.name)}">
                        `
                        : `
                            <span>لا توجد صورة</span>
                        `;


                return `
                    <article class="product-card">

                        <div class="product-card-image">
                            ${imageHTML}
                        </div>

                        <div class="product-card-content">

                            <h4>
                                ${escapeHTML(product.name)}
                            </h4>

                            <strong>
                                ${formatMoney(product.price)}
                            </strong>

                            <span>
                                Barcode:
                                ${escapeHTML(product.barcode)}
                            </span>

                        </div>

                    </article>
                `;

            }).join("");

    }
    catch (error) {

        console.error(
            "Render products error:",
            error
        );

    }

}


/* =========================================================
   SALES
========================================================= */

async function handleSaleBarcode(barcode) {

    if (!barcode) {
        return;
    }


    try {

        const product =
            await getByIndex(
                PRODUCTS_STORE,
                "barcode",
                barcode
            );


        if (!product) {

            currentSaleProduct = null;

            if (quantitySection) {
                quantitySection.hidden = true;
            }


            if (saleProductPreview) {

                saleProductPreview.innerHTML = `
                    <div class="empty-state">

                        <span class="empty-icon">!</span>

                        <h4>
                            المنتج غير مسجل
                        </h4>

                        <p>
                            لم يتم العثور على منتج بهذا الـBarcode.
                        </p>

                    </div>
                `;
            }


            if (saleTotal) {
                saleTotal.textContent =
                    "0 جنيه";
            }


            showNotification(
                "هذا المنتج غير مسجل في STORE CORE."
            );

            return;
        }


        currentSaleProduct = product;


        if (saleProductPreview) {

            const imageHTML =
                product.image
                    ? `
                        <img
                            src="${URL.createObjectURL(product.image)}"
                            alt="${escapeHTML(product.name)}">
                    `
                    : `
                        <div class="sale-product-no-image">
                            لا توجد صورة
                        </div>
                    `;


            saleProductPreview.innerHTML = `

                <div class="sale-product-card">

                    <div class="sale-product-image">
                        ${imageHTML}
                    </div>

                    <div class="sale-product-info">

                        <span class="section-label">
                            PRODUCT
                        </span>

                        <h4>
                            ${escapeHTML(product.name)}
                        </h4>

                        <p>
                            Barcode:
                            ${escapeHTML(product.barcode)}
                        </p>

                        <strong>
                            ${formatMoney(product.price)}
                        </strong>

                    </div>

                </div>
            `;
        }


        if (quantitySection) {
            quantitySection.hidden = false;
        }


        if (saleQuantity) {
            saleQuantity.value = 1;
        }


        updateSaleTotal();


        showNotification(
            "تم العثور على المنتج."
        );

    }
    catch (error) {

        console.error(
            "Sale barcode error:",
            error
        );

        showNotification(
            "حدث خطأ أثناء البحث عن المنتج."
        );

    }

}


function updateSaleTotal() {

    if (
        !currentSaleProduct ||
        !saleQuantity ||
        !saleTotal
    ) {

        return;
    }


    let quantity =
        Number(
            saleQuantity.value
        );


    if (!Number.isFinite(quantity) || quantity < 1) {
        quantity = 1;
    }


    quantity =
        Math.floor(quantity);


    const total =
        currentSaleProduct.price *
        quantity;


    saleTotal.textContent =
        formatMoney(total);
}


if (saleQuantity) {

    saleQuantity.addEventListener(
        "input",
        updateSaleTotal
    );

}


/* =========================================================
   CONFIRM SALE
========================================================= */

if (confirmSaleButton) {

    confirmSaleButton.addEventListener(
        "click",
        async () => {

            if (!currentSaleProduct) {

                showNotification(
                    "امسح Barcode المنتج أولاً."
                );

                return;
            }


            let quantity =
                Number(
                    saleQuantity.value
                );


            if (
                !Number.isFinite(quantity) ||
                quantity < 1
            ) {

                showNotification(
                    "أدخل كمية صحيحة."
                );

                return;
            }


            quantity =
                Math.floor(quantity);


            const total =
                currentSaleProduct.price *
                quantity;


            try {

                /* Record sale */

                await addRecord(
                    SALES_STORE,
                    {
                        productId:
                            currentSaleProduct.id,

                        productName:
                            currentSaleProduct.name,

                        barcode:
                            currentSaleProduct.barcode,

                        price:
                            currentSaleProduct.price,

                        quantity,

                        total,

                        createdAt:
                            new Date().toISOString()
                    }
                );


                /* Update report */

                const report =
                    await getByIndex(
                        REPORTS_STORE,
                        "productId",
                        currentSaleProduct.id
                    );


                if (report) {

                    report.totalQuantity =
                        Number(
                            report.totalQuantity || 0
                        ) + quantity;


                    report.totalSales =
                        Number(
                            report.totalSales || 0
                        ) + total;


                    await putRecord(
                        REPORTS_STORE,
                        report
                    );

                }


                showNotification(
                    `تم تسجيل بيع ${formatNumber(quantity)} قطعة.`
                );


                /* Reset current sale */

                currentSaleProduct = null;


                if (quantitySection) {
                    quantitySection.hidden = true;
                }


                if (saleQuantity) {
                    saleQuantity.value = 1;
                }


                if (saleProductPreview) {

                    saleProductPreview.innerHTML = `
                        <div class="empty-state">

                            <span class="empty-icon">
                                ✓
                            </span>

                            <h4>
                                تم تسجيل البيع
                            </h4>

                            <p>
                                امسح Barcode آخر لإتمام عملية جديدة.
                            </p>

                        </div>
                    `;
                }


                if (saleTotal) {
                    saleTotal.textContent =
                        "0 جنيه";
                }


                updateSaleItemsCount();


                await updateReportOverview();

            }
            catch (error) {

                console.error(
                    "Confirm sale error:",
                    error
                );


                showNotification(
                    "حدث خطأ أثناء تسجيل البيع."
                );

            }

        }
    );

}


/* =========================================================
   SALE ITEMS COUNT
========================================================= */

async function updateSaleItemsCount() {

    if (!saleItemsCount) {
        return;
    }


    try {

        const sales =
            await getAll(
                SALES_STORE
            );


        const totalQuantity =
            sales.reduce(
                (sum, sale) =>
                    sum + Number(sale.quantity || 0),
                0
            );


        saleItemsCount.textContent =
            `${formatNumber(totalQuantity)} قطعة`;

    }
    catch (error) {

        console.error(
            "Sale items count error:",
            error
        );

    }

}


/* =========================================================
   REPORTS
========================================================= */

async function renderReports() {

    if (!reportsList) {
        return;
    }


    try {

        const reports =
            await getAll(
                REPORTS_STORE
            );


        const searchValue =
            reportSearch
                ? reportSearch.value.trim().toLowerCase()
                : "";


        const filteredReports =
            reports.filter(report => {

                if (!searchValue) {
                    return true;
                }


                return (
                    String(report.productName || "")
                        .toLowerCase()
                        .includes(searchValue)
                    ||
                    String(report.barcode || "")
                        .toLowerCase()
                        .includes(searchValue)
                );

            });


        if (!filteredReports.length) {

            reportsList.innerHTML = `
                <div class="empty-state">

                    <span class="empty-icon">
                        ◫
                    </span>

                    <h4>
                        لا توجد تقارير
                    </h4>

                    <p>
                        لا يوجد تقرير مطابق للبحث.
                    </p>

                </div>
            `;

        }
        else {

            reportsList.innerHTML =
                filteredReports.map(report => {

                    const checked =
                        selectedReports.has(
                            report.id
                        )
                            ? "checked"
                            : "";


                    return `
                        <article
                            class="report-item"
                            data-report-id="${report.id}">

                            <div class="report-item-select">

                                <input
                                    type="checkbox"
                                    class="report-checkbox"
                                    data-report-id="${report.id}"
                                    ${checked}>

                            </div>


                            <div class="report-item-info">

                                <h4>
                                    ${escapeHTML(report.productName)}
                                </h4>

                                <span>
                                    Barcode:
                                    ${escapeHTML(report.barcode)}
                                </span>

                            </div>


                            <div class="report-item-stat">

                                <span>
                                    القطع المباعة
                                </span>

                                <strong>
                                    ${formatNumber(report.totalQuantity)}
                                </strong>

                            </div>


                            <div class="report-item-stat">

                                <span>
                                    قيمة المبيعات
                                </span>

                                <strong>
                                    ${formatMoney(report.totalSales)}
                                </strong>

                            </div>


                            <button
                                type="button"
                                class="secondary-button delete-report-button"
                                data-delete-report="${report.id}">

                                حذف التقرير

                            </button>

                        </article>
                    `;

                }).join("");

        }


        bindReportActions();


        await updateReportOverview();

    }
    catch (error) {

        console.error(
            "Render reports error:",
            error
        );

    }

}


/* =========================================================
   REPORT ACTIONS
========================================================= */

function bindReportActions() {

    if (!reportsList) {
        return;
    }


    const checkboxes =
        reportsList.querySelectorAll(
            ".report-checkbox"
        );


    checkboxes.forEach(checkbox => {

        checkbox.addEventListener(
            "change",
            function () {

                const reportId =
                    Number(
                        this.dataset.reportId
                    );


                if (this.checked) {

                    selectedReports.add(
                        reportId
                    );

                }
                else {

                    selectedReports.delete(
                        reportId
                    );

                }

            }
        );

    });


    const deleteButtons =
        reportsList.querySelectorAll(
            "[data-delete-report]"
        );


    deleteButtons.forEach(button => {

        button.addEventListener(
            "click",
            async function () {

                const reportId =
                    Number(
                        this.dataset.deleteReport
                    );


                try {

                    await deleteRecord(
                        REPORTS_STORE,
                        reportId
                    );


                    selectedReports.delete(
                        reportId
                    );


                    showNotification(
                        "تم حذف التقرير."
                    );


                    await renderReports();

                }
                catch (error) {

                    console.error(
                        "Delete report error:",
                        error
                    );


                    showNotification(
                        "حدث خطأ أثناء حذف التقرير."
                    );

                }

            }
        );

    });

}


/* =========================================================
   RESET SELECTED REPORTS
========================================================= */

if (resetSelectedReportsButton) {

    resetSelectedReportsButton.addEventListener(
        "click",
        async () => {

            if (!selectedReports.size) {

                showNotification(
                    "حدد تقريرًا واحدًا على الأقل."
                );

                return;
            }


            try {

                for (
                    const reportId
                    of selectedReports
                ) {

                    const report =
                        await getById(
                            REPORTS_STORE,
                            reportId
                        );


                    if (!report) {
                        continue;
                    }


                    report.totalQuantity = 0;
                    report.totalSales = 0;


                    await putRecord(
                        REPORTS_STORE,
                        report
                    );

                }


                selectedReports.clear();


                showNotification(
                    "تم تصفير التقارير المحددة."
                );


                await renderReports();

            }
            catch (error) {

                console.error(
                    "Reset reports error:",
                    error
                );


                showNotification(
                    "حدث خطأ أثناء تصفير التقارير."
                );

            }

        }
    );

}


/* =========================================================
   REPORT SEARCH
========================================================= */

if (reportSearch) {

    reportSearch.addEventListener(
        "input",
        () => {

            renderReports();

        }
    );

}


/* =========================================================
   REPORT OVERVIEW
========================================================= */

async function updateReportOverview() {

    try {

        const reports =
            await getAll(
                REPORTS_STORE
            );


        const totalQuantity =
            reports.reduce(
                (sum, report) =>
                    sum +
                    Number(
                        report.totalQuantity || 0
                    ),
                0
            );


        const totalSales =
            reports.reduce(
                (sum, report) =>
                    sum +
                    Number(
                        report.totalSales || 0
                    ),
                0
            );


        if (totalSoldCount) {

            totalSoldCount.textContent =
                formatNumber(totalQuantity);
        }


        if (totalSalesValue) {

            totalSalesValue.textContent =
                formatMoney(totalSales);
        }

    }
    catch (error) {

        console.error(
            "Report overview error:",
            error
        );

    }

}


/* =========================================================
   SCANNER MODAL
========================================================= */

function openScannerModal(showMessage = true) {

    if (!scannerModal) {
        return;
    }


    scannerModal.hidden = false;


    if (scannerModalStatus) {

        scannerModalStatus.textContent =
            scannerConnected
                ? "في انتظار قراءة Barcode..."
                : "الهاتف غير متصل — قم بتوصيله أولاً.";
    }


    if (showMessage && !scannerConnected) {

        showNotification(
            "قم بتوصيل الهاتف أولاً."
        );

    }

}


function closeScannerModal() {

    if (!scannerModal) {
        return;
    }


    scannerModal.hidden = true;

}


if (modalCloseButton) {

    modalCloseButton.addEventListener(
        "click",
        closeScannerModal
    );

}


if (scannerModal) {

    scannerModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                scannerModal
            ) {

                closeScannerModal();

            }

        }
    );

}


document.addEventListener(
    "keydown",
    event => {

        if (event.key === "Escape") {

            closeScannerModal();

        }

    }
);


/* =========================================================
   RECEIVE BARCODE
========================================================= */

async function receiveBarcode(barcode) {

    barcode =
        String(
            barcode || ""
        ).trim();


    if (!barcode) {
        return;
    }


    console.log(
        "[STORE CORE] Barcode:",
        barcode
    );


    if (scannerModalStatus) {

        scannerModalStatus.textContent =
            `تمت قراءة Barcode: ${barcode}`;
    }


    closeScannerModal();


    if (currentPage === "products") {

        if (productBarcode) {

            productBarcode.value =
                barcode;
        }


        showNotification(
            "تم تسجيل Barcode المنتج."
        );


        return;
    }


    if (currentPage === "sales") {

        await handleSaleBarcode(
            barcode
        );


        return;
    }


    showNotification(
        "تمت قراءة Barcode."
    );

}


/* =========================================================
   BRIDGE CONNECTION
========================================================= */

async function checkBridge() {

    try {

        const response =
            await fetch(
                `${BRIDGE_URL}/status`,
                {
                    method: "GET",
                    cache: "no-store"
                }
            );


        if (!response.ok) {
            throw new Error(
                "Bridge unavailable"
            );
        }


        const data =
            await response.json();


        if (data.running) {

            setScannerStatus(true);

            return true;
        }


        throw new Error(
            "Bridge not running"
        );

    }
    catch (error) {

        setScannerStatus(false);

        return false;
    }

}


/* =========================================================
   POLL BARCODE QUEUE
========================================================= */

async function pollBarcodeQueue() {

    if (scannerPolling) {
        return;
    }


    scannerPolling = true;


    try {

        while (scannerConnected) {

            try {

                const response =
                    await fetch(
                        `${BRIDGE_URL}/next`,
                        {
                            method: "GET",
                            cache: "no-store"
                        }
                    );


                if (!response.ok) {
                    throw new Error(
                        "Failed to read barcode queue"
                    );
                }


                const data =
                    await response.json();


                if (data.barcode) {

                    await receiveBarcode(
                        data.barcode
                    );

                }

            }
            catch (error) {

                console.error(
                    "Barcode polling error:",
                    error
                );


                setScannerStatus(false);

                break;

            }


            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        300
                    )
            );

        }

    }
    finally {

        scannerPolling = false;

    }

}


/* =========================================================
   CONNECT SCANNER
========================================================= */

async function connectScanner() {

    const connected =
        await checkBridge();


    if (!connected) {

        showNotification(
            "لم يتم العثور على STORE CORE Bridge."
        );


        if (scannerModalStatus) {

            scannerModalStatus.textContent =
                "Bridge غير متصل.";
        }


        return false;
    }


    setScannerStatus(true);


    showNotification(
        "تم توصيل الهاتف بنجاح."
    );


    if (scannerModalStatus) {

        scannerModalStatus.textContent =
            "الهاتف متصل — في انتظار قراءة Barcode...";
    }


    pollBarcodeQueue();


    return true;
}


/* =========================================================
   SALES SCANNER BUTTON
========================================================= */

if (connectScannerButton) {

    connectScannerButton.addEventListener(
        "click",
        async () => {

            const connected =
                await connectScanner();


            if (connected) {

                openScannerModal(
                    false
                );

            }

        }
    );

}


/* =========================================================
   CONNECTION PAGE BUTTON
========================================================= */

if (connectionButton) {

    connectionButton.addEventListener(
        "click",
        async () => {

            await connectScanner();

        }
    );

}


/* =========================================================
   AUTOMATIC BRIDGE CHECK
========================================================= */

async function startBridgeMonitoring() {

    const connected =
        await checkBridge();


    if (connected) {

        pollBarcodeQueue();

    }


    setInterval(
        async () => {

            const bridgeIsAvailable =
                await checkBridge();


            if (
                bridgeIsAvailable &&
                !scannerPolling
            ) {

                pollBarcodeQueue();

            }

        },
        3000
    );

}


/* =========================================================
   PUBLIC SCANNER API
========================================================= */

window.storeCoreScanner = {

    receive(barcode) {

        return receiveBarcode(
            barcode
        );

    },


    connected() {

        setScannerStatus(
            true
        );

    },


    disconnected() {

        setScannerStatus(
            false
        );

    }

};


/* =========================================================
   INITIALIZATION
========================================================= */

async function initializeStoreCore() {

    /*
       Keep the interface working even if
       IndexedDB has a problem.
    */

    try {

        await openDatabase();


        await renderProducts();

        await renderReports();

        await updateReportOverview();

        await updateSaleItemsCount();

    }
    catch (error) {

        console.error(
            "STORE CORE initialization error:",
            error
        );


        showNotification(
            "تعذر تشغيل التخزين المحلي."
        );

    }


    /*
       Sales is ALWAYS the default page.
    */

    navigateTo("sales");


    /*
       Start communication with bridge.
    */

    startBridgeMonitoring();

}


/* =========================================================
   START APP
========================================================= */

initializeStoreCore();
