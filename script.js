/* =========================================================
   STORE CORE
   Phone Camera Version
========================================================= */

const DB_NAME = "STORE_CORE_DB";
const DB_VERSION = 1;

const PRODUCTS_STORE = "products";
const SALES_STORE = "sales";
const REPORTS_STORE = "reports";

/* =========================================================
   STATE
========================================================= */

let db = null;

let currentPage = "sales";
let currentProductImage = null;
let currentSaleProduct = null;

let cameraStream = null;
let cameraVideo = null;
let barcodeDetector = null;
let cameraScanning = false;
let cameraScanFrame = null;

const selectedReports = new Set();

/* =========================================================
   DOM
========================================================= */

const sidebar = document.getElementById("sidebar");
const mobileMenuButton = document.getElementById("mobileMenuButton");

const navItems = document.querySelectorAll(".nav-item");
const pages = document.querySelectorAll("[data-page-content]");
const currentPageName = document.getElementById("currentPageName");

/* Products */
const addProductButton = document.getElementById("addProductButton");
const productForm = document.getElementById("productForm");
const productImagePreview = document.getElementById("productImagePreview");
const productImage = document.getElementById("productImage");
const productName = document.getElementById("productName");
const productPrice = document.getElementById("productPrice");
const productBarcode = document.getElementById("productBarcode");
const scanProductBarcodeButton =
    document.getElementById("scanProductBarcodeButton");
const productsCount = document.getElementById("productsCount");
const productsGrid = document.getElementById("productsGrid");

/* Sales */
const scannerStatus = document.getElementById("scannerStatus");
const connectScannerButton =
    document.getElementById("connectScannerButton");
const saleItemsCount = document.getElementById("saleItemsCount");
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

/* Reports */
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

/* Connection */
const connectionStatus =
    document.getElementById("connectionStatus");
const connectionButton =
    document.getElementById("connectionButton");

/* Scanner */
const scannerModal =
    document.getElementById("scannerModal");
const scannerModalStatus =
    document.getElementById("scannerModalStatus");
const modalCloseButton =
    document.querySelector("[data-close-modal]");

/* Notification */
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
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = event => {
            const database = event.target.result;

            if (!database.objectStoreNames.contains(PRODUCTS_STORE)) {
                const store = database.createObjectStore(
                    PRODUCTS_STORE,
                    {
                        keyPath: "id",
                        autoIncrement: true
                    }
                );

                store.createIndex(
                    "barcode",
                    "barcode",
                    { unique: true }
                );

                store.createIndex(
                    "name",
                    "name",
                    { unique: false }
                );
            }

            if (!database.objectStoreNames.contains(SALES_STORE)) {
                const store = database.createObjectStore(
                    SALES_STORE,
                    {
                        keyPath: "id",
                        autoIncrement: true
                    }
                );

                store.createIndex(
                    "productId",
                    "productId",
                    { unique: false }
                );

                store.createIndex(
                    "barcode",
                    "barcode",
                    { unique: false }
                );
            }

            if (!database.objectStoreNames.contains(REPORTS_STORE)) {
                const store = database.createObjectStore(
                    REPORTS_STORE,
                    {
                        keyPath: "id",
                        autoIncrement: true
                    }
                );

                store.createIndex(
                    "productId",
                    "productId",
                    { unique: true }
                );

                store.createIndex(
                    "barcode",
                    "barcode",
                    { unique: true }
                );
            }
        };

        request.onsuccess = event => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = () => {
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
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getAll(storeName) {
    await databaseReady();

    const transaction =
        db.transaction(storeName, "readonly");

    return dbRequest(
        transaction
            .objectStore(storeName)
            .getAll()
    );
}

async function getById(storeName, id) {
    await databaseReady();

    const transaction =
        db.transaction(storeName, "readonly");

    return dbRequest(
        transaction
            .objectStore(storeName)
            .get(id)
    );
}

async function getByIndex(storeName, indexName, value) {
    await databaseReady();

    const transaction =
        db.transaction(storeName, "readonly");

    return dbRequest(
        transaction
            .objectStore(storeName)
            .index(indexName)
            .get(value)
    );
}

async function addRecord(storeName, data) {
    await databaseReady();

    const transaction =
        db.transaction(storeName, "readwrite");

    return dbRequest(
        transaction
            .objectStore(storeName)
            .add(data)
    );
}

async function putRecord(storeName, data) {
    await databaseReady();

    const transaction =
        db.transaction(storeName, "readwrite");

    return dbRequest(
        transaction
            .objectStore(storeName)
            .put(data)
    );
}

async function deleteRecord(storeName, id) {
    await databaseReady();

    const transaction =
        db.transaction(storeName, "readwrite");

    return dbRequest(
        transaction
            .objectStore(storeName)
            .delete(id)
    );
}

/* =========================================================
   UTILITIES
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

    clearTimeout(showNotification.timer);

    showNotification.timer = setTimeout(() => {
        notification.hidden = true;
    }, 3000);
}

function setScannerStatus(connected) {
    if (scannerStatus) {
        scannerStatus.textContent =
            connected ? "الكاميرا جاهزة" : "غير جاهزة";
    }

    if (connectionStatus) {
        connectionStatus.textContent =
            connected ? "الكاميرا جاهزة" : "غير جاهزة";
    }

    if (connectScannerButton) {
        connectScannerButton.textContent =
            connected
                ? "فتح الكاميرا"
                : "فتح الكاميرا";
    }

    if (connectionButton) {
        connectionButton.textContent =
            connected
                ? "فتح الكاميرا"
                : "فتح الكاميرا";
    }
}

/* =========================================================
   NAVIGATION
========================================================= */

function navigateTo(pageName) {
    const pageExists = document.querySelector(
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
            pageTitles[pageName] || pageName;
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
    item.addEventListener("click", () => {
        navigateTo(item.dataset.page);
    });
});

/* =========================================================
   MOBILE SIDEBAR
========================================================= */

if (mobileMenuButton) {
    mobileMenuButton.addEventListener("click", () => {
        if (!sidebar) {
            return;
        }

        sidebar.classList.toggle("open");
    });
}

/* =========================================================
   PRODUCT IMAGE
========================================================= */

if (productImage) {
    productImage.addEventListener("change", function () {
        const file =
            this.files && this.files[0];

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
    });
}

/* =========================================================
   PRODUCT FORM RESET
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
   ADD PRODUCT
========================================================= */

if (addProductButton) {
    addProductButton.addEventListener("click", () => {
        resetProductForm();

        if (productForm) {
            productForm.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    });
}

/* =========================================================
   PRODUCT BARCODE BUTTON
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
        async event => {
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
                        "هذا الـBarcode مسجل بالفعل."
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

            } catch (error) {
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
            await getAll(PRODUCTS_STORE);

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
                                src="${URL.createObjectURL(
                                    product.image
                                )}"
                                alt="${escapeHTML(
                                    product.name
                                )}">
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
                                ${escapeHTML(
                                    product.name
                                )}
                            </h4>

                            <strong>
                                ${formatMoney(
                                    product.price
                                )}
                            </strong>

                            <span>
                                Barcode:
                                ${escapeHTML(
                                    product.barcode
                                )}
                            </span>

                        </div>

                    </article>
                `;
            }).join("");

    } catch (error) {
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
                            src="${URL.createObjectURL(
                                product.image
                            )}"
                            alt="${escapeHTML(
                                product.name
                            )}">
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
                            ${escapeHTML(
                                product.name
                            )}
                        </h4>

                        <p>
                            Barcode:
                            ${escapeHTML(
                                product.barcode
                            )}
                        </p>

                        <strong>
                            ${formatMoney(
                                product.price
                            )}
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

    } catch (error) {
        console.error(
            "Sale barcode error:",
            error
        );

        showNotification(
            "حدث خطأ أثناء البحث عن المنتج."
        );
    }
}

/* =========================================================
   SALE TOTAL
========================================================= */

function updateSaleTotal() {
    if (
        !currentSaleProduct ||
        !saleQuantity ||
        !saleTotal
    ) {
        return;
    }

    let quantity =
        Number(saleQuantity.value);

    if (
        !Number.isFinite(quantity) ||
        quantity < 1
    ) {
        quantity = 1;
    }

    quantity = Math.floor(quantity);

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
                Number(saleQuantity.value);

            if (
                !Number.isFinite(quantity) ||
                quantity < 1
            ) {
                showNotification(
                    "أدخل كمية صحيحة."
                );
                return;
            }

            quantity = Math.floor(quantity);

            const total =
                currentSaleProduct.price *
                quantity;

            try {

                /*
                   تسجيل عملية البيع فقط.
                   لا يوجد خصم من المخزون.
                */

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
                    `تم تسجيل بيع ${formatNumber(
                        quantity
                    )} قطعة.`
                );

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

                await updateSaleItemsCount();
                await updateReportOverview();

                /*
                   بعد تسجيل البيع:
                   افتح الكاميرا مرة أخرى مباشرة.
                */

                setTimeout(() => {
                    openScannerModal(false);
                }, 250);

            } catch (error) {

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
            await getAll(SALES_STORE);

        const totalQuantity =
            sales.reduce(
                (sum, sale) =>
                    sum +
                    Number(sale.quantity || 0),
                0
            );

        saleItemsCount.textContent =
            `${formatNumber(
                totalQuantity
            )} قطعة`;

    } catch (error) {
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
            await getAll(REPORTS_STORE);

        const searchValue =
            reportSearch
                ? reportSearch.value
                    .trim()
                    .toLowerCase()
                : "";

        const filteredReports =
            reports.filter(report => {

                if (!searchValue) {
                    return true;
                }

                return (
                    String(
                        report.productName || ""
                    )
                    .toLowerCase()
                    .includes(searchValue)

                    ||

                    String(
                        report.barcode || ""
                    )
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

        } else {

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
                                    ${escapeHTML(
                                        report.productName
                                    )}
                                </h4>

                                <span>
                                    Barcode:
                                    ${escapeHTML(
                                        report.barcode
                                    )}
                                </span>

                            </div>

                            <div class="report-item-stat">

                                <span>
                                    القطع المباعة
                                </span>

                                <strong>
                                    ${formatNumber(
                                        report.totalQuantity
                                    )}
                                </strong>

                            </div>

                            <div class="report-item-stat">

                                <span>
                                    قيمة المبيعات
                                </span>

                                <strong>
                                    ${formatMoney(
                                        report.totalSales
                                    )}
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

    } catch (error) {
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
                } else {
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

                } catch (error) {

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

            } catch (error) {

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
            await getAll(REPORTS_STORE);

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

    } catch (error) {

        console.error(
            "Report overview error:",
            error
        );
    }
}

/* =========================================================
   PHONE CAMERA SCANNER
========================================================= */

function getScannerContainer() {

    if (!scannerModal) {
        return null;
    }

    return (
        scannerModal.querySelector(
            ".scanner-frame"
        ) ||

        scannerModal.querySelector(
            ".scanner-area"
        ) ||

        scannerModal.querySelector(
            ".modal-scanner-area"
        ) ||

        scannerModal
    );
}

/* =========================================================
   CREATE CAMERA VIDEO
========================================================= */

function createCameraView() {

    const container =
        getScannerContainer();

    if (!container) {
        return null;
    }

    if (cameraVideo) {
        return cameraVideo;
    }

    cameraVideo =
        document.createElement("video");

    cameraVideo.id =
        "storeCoreCamera";

    cameraVideo.autoplay = true;
    cameraVideo.muted = true;
    cameraVideo.playsInline = true;

    cameraVideo.setAttribute(
        "playsinline",
        ""
    );

    cameraVideo.style.width =
        "100%";

    cameraVideo.style.height =
        "100%";

    cameraVideo.style.objectFit =
        "cover";

    cameraVideo.style.borderRadius =
        "inherit";

    container.appendChild(
        cameraVideo
    );

    return cameraVideo;
}

/* =========================================================
   START CAMERA
========================================================= */

async function startCameraScanner() {

    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        if (scannerModalStatus) {
            scannerModalStatus.textContent =
                "المتصفح لا يدعم تشغيل الكاميرا.";
        }

        showNotification(
            "المتصفح لا يدعم استخدام الكاميرا."
        );

        setScannerStatus(false);

        return false;
    }

    /*
       BarcodeDetector هو القارئ المستخدم
       لقراءة Barcode من كاميرا الهاتف.
    */

    if (!("BarcodeDetector" in window)) {

        if (scannerModalStatus) {
            scannerModalStatus.textContent =
                "قارئ Barcode غير مدعوم في هذا المتصفح.";
        }

        showNotification(
            "قارئ Barcode غير مدعوم في هذا المتصفح."
        );

        setScannerStatus(false);

        return false;
    }

    try {

        if (!barcodeDetector) {

            const formats = [
                "ean_13",
                "ean_8",
                "upc_a",
                "upc_e",
                "code_128",
                "code_39",
                "itf"
            ];

            barcodeDetector =
                new BarcodeDetector({
                    formats
                });
        }

        stopCameraScanner();

        const stream =
            await navigator.mediaDevices
                .getUserMedia({
                    video: {
                        facingMode: {
                            ideal: "environment"
                        },

                        width: {
                            ideal: 1280
                        },

                        height: {
                            ideal: 720
                        }
                    },

                    audio: false
                });

        cameraStream = stream;

        cameraVideo =
            createCameraView();

        if (!cameraVideo) {
            throw new Error(
                "Camera video element unavailable"
            );
        }

        cameraVideo.srcObject =
            stream;

        await cameraVideo.play();

        cameraScanning = true;

        setScannerStatus(true);

        if (scannerModalStatus) {
            scannerModalStatus.textContent =
                "وجّه الكاميرا إلى Barcode المنتج...";
        }

        scanCameraFrame();

        return true;

    } catch (error) {

        console.error(
            "Camera scanner error:",
            error
        );

        stopCameraScanner();

        setScannerStatus(false);

        if (scannerModalStatus) {
            scannerModalStatus.textContent =
                "تعذر الوصول إلى الكاميرا.";
        }

        if (
            error &&
            error.name === "NotAllowedError"
        ) {

            showNotification(
                "اسمح للموقع باستخدام الكاميرا ثم حاول مرة أخرى."
            );

        } else {

            showNotification(
                "تعذر تشغيل كاميرا الهاتف."
            );
        }

        return false;
    }
}

/* =========================================================
   SCAN CAMERA FRAME
========================================================= */

async function scanCameraFrame() {

    if (
        !cameraScanning ||
        !cameraVideo ||
        !barcodeDetector
    ) {
        return;
    }

    try {

        if (
            cameraVideo.readyState >=
            HTMLMediaElement.HAVE_CURRENT_DATA
        ) {

            const barcodes =
                await barcodeDetector.detect(
                    cameraVideo
                );

            if (
                barcodes &&
                barcodes.length
            ) {

                const barcode =
                    barcodes[0].rawValue;

                if (barcode) {

                    /*
                       أوقف البحث لحظة حتى لا يتم
                       تسجيل نفس Barcode أكثر من مرة.
                    */

                    cameraScanning = false;

                    await receiveBarcode(
                        barcode
                    );

                    return;
                }
            }
        }

    } catch (error) {

        console.warn(
            "Barcode detection error:",
            error
        );
    }

    if (cameraScanning) {

        cameraScanFrame =
            requestAnimationFrame(
                scanCameraFrame
            );
    }
}

/* =========================================================
   STOP CAMERA
========================================================= */

function stopCameraScanner() {

    cameraScanning = false;

    if (cameraScanFrame) {

        cancelAnimationFrame(
            cameraScanFrame
        );

        cameraScanFrame = null;
    }

    if (cameraStream) {

        cameraStream
            .getTracks()
            .forEach(track => {
                track.stop();
            });

        cameraStream = null;
    }

    if (cameraVideo) {

        cameraVideo.pause();

        cameraVideo.srcObject =
            null;
    }

    setScannerStatus(false);
}

/* =========================================================
   OPEN SCANNER MODAL
========================================================= */

async function openScannerModal(
    showMessage = true
) {

    if (!scannerModal) {
        return false;
    }

    scannerModal.hidden = false;

    if (scannerModalStatus) {
        scannerModalStatus.textContent =
            "جاري تشغيل كاميرا الهاتف...";
    }

    const started =
        await startCameraScanner();

    if (
        !started &&
        showMessage
    ) {

        showNotification(
            "تعذر تشغيل كاميرا الهاتف."
        );
    }

    return started;
}

/* =========================================================
   CLOSE SCANNER
========================================================= */

function closeScannerModal() {

    if (!scannerModal) {
        return;
    }

    stopCameraScanner();

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

        if (
            event.key ===
            "Escape"
        ) {

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

    /* Product Registration */

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

    /* Sales */

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
   CAMERA BUTTONS
========================================================= */

/*
   الزر الموجود في صفحة البيع
*/

if (connectScannerButton) {

    connectScannerButton.addEventListener(
        "click",
        async () => {

            await openScannerModal(true);
        }
    );
}

/*
   الزر الموجود في صفحة الربط
*/

if (connectionButton) {

    connectionButton.addEventListener(
        "click",
        async () => {

            await openScannerModal(true);
        }
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
        setScannerStatus(true);
    },

    disconnected() {
        setScannerStatus(false);
    }

};

/* =========================================================
   INITIALIZATION
========================================================= */

async function initializeStoreCore() {

    try {

        await openDatabase();

        await renderProducts();

        await renderReports();

        await updateReportOverview();

        await updateSaleItemsCount();

    } catch (error) {

        console.error(
            "STORE CORE initialization error:",
            error
        );

        showNotification(
            "تعذر تشغيل التخزين المحلي."
        );
    }

    /*
       البيع هو الصفحة الافتراضية دائمًا.
    */

    navigateTo("sales");
}

/* =========================================================
   START APP
========================================================= */

initializeStoreCore();
