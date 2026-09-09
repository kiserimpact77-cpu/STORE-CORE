/* =========================================================
   STORE CORE
   Main JavaScript
   Local Storage: IndexedDB
========================================================= */


/* =========================================================
   01 — DATABASE
========================================================= */

const DB_NAME = "STORE_CORE_DB";
const DB_VERSION = 1;

const STORES = {
    PRODUCTS: "products",
    SALES: "sales",
    REPORTS: "reports"
};

let db;


/* =========================================================
   02 — APPLICATION STATE
========================================================= */

const state = {
    currentPage: "products",

    currentProductImage: null,
    currentSaleProduct: null,

    selectedReports: new Set(),

    scannerConnected: false
};


/* =========================================================
   03 — DOM
========================================================= */

const elements = {
    sidebar: document.getElementById("sidebar"),
    mobileMenuButton: document.getElementById("mobileMenuButton"),

    currentPageName: document.getElementById("currentPageName"),

    navItems: document.querySelectorAll(".nav-item"),
    pages: document.querySelectorAll("[data-page-content]"),

    productForm: document.getElementById("productForm"),
    productName: document.getElementById("productName"),
    productPrice: document.getElementById("productPrice"),
    productBarcode: document.getElementById("productBarcode"),

    productImage: document.getElementById("productImage"),
    productImagePreview: document.getElementById("productImagePreview"),

    productsGrid: document.getElementById("productsGrid"),
    productsCount: document.getElementById("productsCount"),

    addProductButton: document.getElementById("addProductButton"),
    scanProductBarcodeButton:
        document.getElementById("scanProductBarcodeButton"),

    scannerModal: document.getElementById("scannerModal"),
    scannerModalStatus:
        document.getElementById("scannerModalStatus"),

    connectScannerButton:
        document.getElementById("connectScannerButton"),

    scannerStatus:
        document.getElementById("scannerStatus"),

    saleProductPreview:
        document.getElementById("saleProductPreview"),

    quantitySection:
        document.getElementById("quantitySection"),

    saleQuantity:
        document.getElementById("saleQuantity"),

    confirmSaleButton:
        document.getElementById("confirmSaleButton"),

    saleItemsCount:
        document.getElementById("saleItemsCount"),

    saleTotal:
        document.getElementById("saleTotal"),

    reportsList:
        document.getElementById("reportsList"),

    reportSearch:
        document.getElementById("reportSearch"),

    resetSelectedReportsButton:
        document.getElementById("resetSelectedReportsButton"),

    totalSoldCount:
        document.getElementById("totalSoldCount"),

    totalSalesValue:
        document.getElementById("totalSalesValue"),

    notification:
        document.getElementById("notification"),

    notificationMessage:
        document.getElementById("notificationMessage")
};


/* =========================================================
   04 — DATABASE INITIALIZATION
========================================================= */

function openDatabase() {
    return new Promise((resolve, reject) => {

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = function (event) {

            const database = event.target.result;

            if (!database.objectStoreNames.contains(STORES.PRODUCTS)) {

                const productsStore = database.createObjectStore(
                    STORES.PRODUCTS,
                    {
                        keyPath: "id",
                        autoIncrement: true
                    }
                );

                productsStore.createIndex(
                    "barcode",
                    "barcode",
                    { unique: true }
                );
            }


            if (!database.objectStoreNames.contains(STORES.SALES)) {

                const salesStore = database.createObjectStore(
                    STORES.SALES,
                    {
                        keyPath: "id",
                        autoIncrement: true
                    }
                );

                salesStore.createIndex(
                    "productId",
                    "productId",
                    { unique: false }
                );

                salesStore.createIndex(
                    "createdAt",
                    "createdAt",
                    { unique: false }
                );
            }


            if (!database.objectStoreNames.contains(STORES.REPORTS)) {

                const reportsStore = database.createObjectStore(
                    STORES.REPORTS,
                    {
                        keyPath: "productId"
                    }
                );
            }
        };


        request.onsuccess = function () {

            db = request.result;

            db.onversionchange = function () {
                db.close();
            };

            resolve(db);
        };


        request.onerror = function () {
            reject(request.error);
        };
    });
}


/* =========================================================
   05 — DATABASE HELPERS
========================================================= */

function dbRequest(storeName, mode, callback) {

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(
            storeName,
            mode
        );

        const store = transaction.objectStore(storeName);

        let request;

        try {
            request = callback(store);
        } catch (error) {
            reject(error);
            return;
        }

        request.onsuccess = function () {
            resolve(request.result);
        };

        request.onerror = function () {
            reject(request.error);
        };
    });
}


function getAll(storeName) {
    return dbRequest(
        storeName,
        "readonly",
        store => store.getAll()
    );
}


function getById(storeName, id) {
    return dbRequest(
        storeName,
        "readonly",
        store => store.get(id)
    );
}


function addRecord(storeName, data) {
    return dbRequest(
        storeName,
        "readwrite",
        store => store.add(data)
    );
}


function putRecord(storeName, data) {
    return dbRequest(
        storeName,
        "readwrite",
        store => store.put(data)
    );
}


function deleteRecord(storeName, id) {
    return dbRequest(
        storeName,
        "readwrite",
        store => store.delete(id)
    );
}


/* =========================================================
   06 — FORMATTING
========================================================= */

function formatMoney(value) {

    const number = Number(value) || 0;

    return `${ number.toLocaleString("ar-EG") } جنيه`;
}


function formatNumber(value) {

    return Number(value || 0).toLocaleString("ar-EG");
}


/* =========================================================
   07 — NOTIFICATIONS
========================================================= */

let notificationTimer = null;

function showNotification(message) {

    if (!elements.notification) {
        return;
    }

    elements.notificationMessage.textContent = message;

    elements.notification.hidden = false;

    clearTimeout(notificationTimer);

    notificationTimer = setTimeout(() => {

        elements.notification.hidden = true;

    }, 3000);
}


/* =========================================================
   08 — NAVIGATION
========================================================= */

const pageNames = {
    products: "تسجيل المنتجات",
    sales: "البيع",
    reports: "التقارير",
    developer: "المطور"
};


function navigateTo(pageName) {

    const targetPage = document.querySelector(
        `[data - page - content= "${pageName}"]`
    );

    if (!targetPage) {
        return;
    }


    state.currentPage = pageName;


    elements.pages.forEach(page => {

        page.classList.toggle(
            "active-page",
            page.dataset.pageContent === pageName
        );
    });


    elements.navItems.forEach(item => {

        item.classList.toggle(
            "active",
            item.dataset.page === pageName
        );
    });


    if (elements.currentPageName) {

        elements.currentPageName.textContent =
            pageNames[pageName] || pageName;
    }


    if (elements.sidebar) {
        elements.sidebar.classList.remove("open");
    }


    if (pageName === "reports") {
        renderReports();
    }


    if (pageName === "products") {
        renderProducts();
    }
}


/* =========================================================
   09 — MOBILE SIDEBAR
========================================================= */

function setupNavigation() {

    elements.navItems.forEach(item => {

        item.addEventListener("click", () => {

            const page = item.dataset.page;

            navigateTo(page);
        });
    });


    if (elements.mobileMenuButton) {

        elements.mobileMenuButton.addEventListener(
            "click",
            () => {

                elements.sidebar.classList.toggle("open");
            }
        );
    }
}


/* =========================================================
   10 — PRODUCT IMAGE
========================================================= */

function setupProductImage() {

    if (!elements.productImage) {
        return;
    }


    elements.productImage.addEventListener(
        "change",
        event => {

            const file = event.target.files?.[0];

            if (!file) {
                return;
            }


            if (!file.type.startsWith("image/")) {

                showNotification(
                    "الملف المختار ليس صورة."
                );

                elements.productImage.value = "";

                return;
            }


            state.currentProductImage = file;


            const reader = new FileReader();

            reader.onload = function () {

                elements.productImagePreview.innerHTML = "";

                const image = document.createElement("img");

                image.src = reader.result;

                image.alt = "صورة المنتج";

                elements.productImagePreview.appendChild(image);
            };

            reader.readAsDataURL(file);
        }
    );
}


/* =========================================================
   11 — PRODUCT BARCODE
========================================================= */

/*
    هذه الوظيفة هي نقطة استقبال Barcode.

    أي طبقة Scanner حقيقية مستقبلًا يمكنها استدعاء:

        receiveBarcode("6281234567890");

    وسيعمل النظام حسب الصفحة الحالية:
    - products → تسجيل Barcode للمنتج
    - sales    → البحث عن المنتج وبدء البيع
*/

async function receiveBarcode(barcode) {

    barcode = String(barcode || "").trim();

    if (!barcode) {
        return;
    }


    if (state.currentPage === "products") {

        if (elements.productBarcode) {
            elements.productBarcode.value = barcode;
        }

        closeScannerModal();

        showNotification(
            "تم تسجيل Barcode للمنتج."
        );

        return;
    }


    if (state.currentPage === "sales") {

        await handleSaleBarcode(barcode);

        return;
    }
}


/* =========================================================
   12 — BARCODE INPUT FALLBACK
========================================================= */

/*
    هذا ليس اتصال الهاتف.

    هو فقط دعم لأجهزة Barcode التي تتصرف مثل Keyboard
    وتكتب الكود داخل المتصفح ثم ترسل Enter.
*/

let scannerBuffer = "";
let scannerBufferTimer = null;

function setupKeyboardBarcodeFallback() {

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key.length === 1 &&
                /[0-9]/.test(event.key)
            ) {

                scannerBuffer += event.key;

                clearTimeout(scannerBufferTimer);

                scannerBufferTimer = setTimeout(
                    () => {
                        scannerBuffer = "";
                    },
                    100
                );

                return;
            }


            if (
                event.key === "Enter" &&
                scannerBuffer.length >= 4
            ) {

                const barcode = scannerBuffer;

                scannerBuffer = "";

                receiveBarcode(barcode);
            }
        }
    );
}


/* =========================================================
   13 — SCANNER MODAL
========================================================= */

function openScannerModal() {

    if (!elements.scannerModal) {
        return;
    }

    elements.scannerModal.hidden = false;

    if (elements.scannerModalStatus) {

        elements.scannerModalStatus.textContent =
            "في انتظار قراءة Barcode...";
    }
}


function closeScannerModal() {

    if (!elements.scannerModal) {
        return;
    }

    elements.scannerModal.hidden = true;
}


function setupScannerModal() {

    document.addEventListener(
        "click",
        event => {

            if (
                event.target.matches(
                    "[data-close-modal]"
                )
            ) {

                closeScannerModal();
            }
        }
    );


    elements.scannerModal?.addEventListener(
        "click",
        event => {

            if (event.target === elements.scannerModal) {

                closeScannerModal();
            }
        }
    );


    document.addEventListener(
        "keydown",
        event => {

            if (event.key === "Escape") {
                closeScannerModal();
            }
        }
    );


    elements.scanProductBarcodeButton?.addEventListener(
        "click",
        () => {

            openScannerModal();
        }
    );


    elements.connectScannerButton?.addEventListener(
        "click",
        () => {

            /*
                لا ندّعي أن USB اتصل هنا.
                الاتصال الحقيقي بالهاتف يحتاج طبقة USB خارج
                JavaScript العادي في المتصفح.
            */

            showNotification(
                "تم فتح وضع انتظار الـScanner."
            );

            openScannerModal();
        }
    );
}


/* =========================================================
   14 — ADD PRODUCT
========================================================= */

async function handleProductSubmit(event) {

    event.preventDefault();


    const name =
        elements.productName.value.trim();

    const price =
        Number(elements.productPrice.value);

    const barcode =
        elements.productBarcode.value.trim();


    if (!name) {

        showNotification(
            "اكتب اسم المنتج أولًا."
        );

        elements.productName.focus();

        return;
    }


    if (!Number.isFinite(price) || price < 0) {

        showNotification(
            "أدخل سعرًا صحيحًا."
        );

        elements.productPrice.focus();

        return;
    }


    if (!barcode) {

        showNotification(
            "يجب تسجيل Barcode للمنتج."
        );

        return;
    }


    const products = await getAll(
        STORES.PRODUCTS
    );


    const barcodeExists = products.some(
        product =>
            product.barcode === barcode
    );


    if (barcodeExists) {

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
            state.currentProductImage || null,

        createdAt:
            new Date().toISOString()
    };


    try {

        await addRecord(
            STORES.PRODUCTS,
            product
        );


        await ensureReportExists(
            product
        );


        resetProductForm();

        await renderProducts();

        showNotification(
            "تم تسجيل المنتج بنجاح."
        );

    } catch (error) {

        console.error(error);

        showNotification(
            "حدث خطأ أثناء تسجيل المنتج."
        );
    }
}


/* =========================================================
   15 — RESET PRODUCT FORM
========================================================= */

function resetProductForm() {

    elements.productForm?.reset();

    state.currentProductImage = null;

    if (elements.productBarcode) {
        elements.productBarcode.value = "";
    }


    if (elements.productImagePreview) {

        elements.productImagePreview.innerHTML =
            "<span>صورة المنتج</span>";
    }
}


/* =========================================================
   16 — RENDER PRODUCTS
========================================================= */

async function renderProducts() {

    if (!elements.productsGrid) {
        return;
    }


    const products =
        await getAll(STORES.PRODUCTS);


    elements.productsGrid.innerHTML = "";


    elements.productsCount.textContent =
        `${ formatNumber(products.length) } منتج`;


    if (products.length === 0) {

        elements.productsGrid.innerHTML = `
    < div class="empty-state" >
                <span class="empty-icon">▣</span>
                <h4>لا توجد منتجات</h4>
                <p>ابدأ بتسجيل أول منتج.</p>
            </ >
    `;

        return;
    }


    products
        .sort(
            (a, b) =>
                new Date(b.createdAt) -
                new Date(a.createdAt)
        )
        .forEach(product => {

            const card =
                createProductCard(product);

            elements.productsGrid.appendChild(card);
        });
}


/* =========================================================
   17 — PRODUCT CARD
========================================================= */

function createProductCard(product) {

    const card =
        document.createElement("article");

    card.className = "product-card";


    const imageArea =
        document.createElement("div");

    imageArea.className =
        "product-card-image";


    if (product.image) {

        const image =
            document.createElement("img");

        const objectUrl =
            URL.createObjectURL(product.image);

        image.src = objectUrl;

        image.alt = product.name;

        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
        };

        imageArea.appendChild(image);

    } else {

        imageArea.innerHTML =
            "<span>بدون صورة</span>";
    }


    const content =
        document.createElement("div");

    content.className =
        "product-card-content";


    const name =
        document.createElement("h4");

    name.textContent =
        product.name;


    const price =
        document.createElement("strong");

    price.textContent =
        formatMoney(product.price);


    const barcode =
        document.createElement("span");

    barcode.textContent =
        `Barcode: ${ product.barcode } `;


    barcode.className =
        "product-card-barcode";


    content.appendChild(name);
    content.appendChild(price);
    content.appendChild(barcode);


    card.appendChild(imageArea);
    card.appendChild(content);


    return card;
}


/* =========================================================
   18 — REPORT CREATION
========================================================= */

async function ensureReportExists(product) {

    const existing =
        await getById(
            STORES.REPORTS,
            product.id
        );


    if (existing) {
        return;
    }


    await putRecord(
        STORES.REPORTS,
        {
            productId: product.id,

            productName: product.name,

            price: product.price,

            soldCount: 0,

            totalValue: 0,

            hidden: false,

            createdAt:
                new Date().toISOString()
        }
    );
}


/* =========================================================
   19 — FIND PRODUCT BY BARCODE
========================================================= */

async function findProductByBarcode(barcode) {

    const products =
        await getAll(STORES.PRODUCTS);


    return products.find(
        product =>
            product.barcode === barcode
    ) || null;
}


/* =========================================================
   20 — SALE BARCODE
========================================================= */

async function handleSaleBarcode(barcode) {

    const product =
        await findProductByBarcode(barcode);


    if (!product) {

        showNotification(
            "هذا الـBarcode غير مسجل."
        );

        return;
    }


    state.currentSaleProduct =
        product;


    renderSaleProduct(product);

    showNotification(
        `تم العثور على ${ product.name }.`
    );
}


/* =========================================================
   21 — RENDER CURRENT SALE PRODUCT
========================================================= */

function renderSaleProduct(product) {

    if (!elements.saleProductPreview) {
        return;
    }


    elements.saleProductPreview.innerHTML = "";


    const wrapper =
        document.createElement("div");

    wrapper.className =
        "sale-product-result";


    if (product.image) {

        const image =
            document.createElement("img");

        const objectUrl =
            URL.createObjectURL(product.image);

        image.src = objectUrl;

        image.alt = product.name;

        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
        };

        wrapper.appendChild(image);
    }


    const info =
        document.createElement("div");

    info.className =
        "sale-product-info";


    const name =
        document.createElement("h4");

    name.textContent =
        product.name;


    const price =
        document.createElement("strong");

    price.textContent =
        formatMoney(product.price);


    const barcode =
        document.createElement("span");

    barcode.textContent =
        product.barcode;


    info.appendChild(name);
    info.appendChild(price);
    info.appendChild(barcode);


    wrapper.appendChild(info);

    elements.saleProductPreview.appendChild(wrapper);


    elements.quantitySection.hidden = false;

    elements.saleQuantity.value = 1;

    elements.saleItemsCount.textContent =
        "1 منتج";


    updateSaleTotal();
}


/* =========================================================
   22 — SALE TOTAL
========================================================= */

function updateSaleTotal() {

    const product =
        state.currentSaleProduct;


    if (!product) {

        elements.saleTotal.textContent =
            "0 جنيه";

        return;
    }


    let quantity =
        Number(elements.saleQuantity.value);


    if (!Number.isInteger(quantity) || quantity < 1) {
        quantity = 1;
    }


    const total =
        product.price * quantity;


    elements.saleTotal.textContent =
        formatMoney(total);
}


/* =========================================================
   23 — REGISTER SALE
========================================================= */

async function registerSale() {

    const product =
        state.currentSaleProduct;


    if (!product) {

        showNotification(
            "امسح Barcode المنتج أولًا."
        );

        return;
    }


    const quantity =
        Number(elements.saleQuantity.value);


    if (
        !Number.isInteger(quantity) ||
        quantity < 1
    ) {

        showNotification(
            "أدخل كمية صحيحة."
        );

        elements.saleQuantity.focus();

        return;
    }


    const total =
        product.price * quantity;


    const sale = {

        productId: product.id,

        productName: product.name,

        barcode: product.barcode,

        unitPrice: product.price,

        quantity,

        total,

        createdAt:
            new Date().toISOString()
    };


    try {

        /*
            1 — حفظ عملية البيع
        */

        await addRecord(
            STORES.SALES,
            sale
        );


        /*
            2 — تحديث التقرير
        */

        const report =
            await getById(
                STORES.REPORTS,
                product.id
            );


        const updatedReport = {

            productId: product.id,

            productName: product.name,

            price: product.price,

            soldCount:
                (report?.soldCount || 0) +
                quantity,

            totalValue:
                (report?.totalValue || 0) +
                total,

            hidden: false,

            createdAt:
                report?.createdAt ||
                new Date().toISOString()
        };


        await putRecord(
            STORES.REPORTS,
            updatedReport
        );


        /*
            3 — تنظيف عملية البيع الحالية
        */

        state.currentSaleProduct = null;


        elements.saleProductPreview.innerHTML = `
    < div class="empty-state" >
                <span class="empty-icon">✓</span>
                <h4>تم تسجيل البيع</h4>
                <p>يمكنك مسح Barcode آخر.</p>
            </ >
    `;


        elements.quantitySection.hidden = true;

        elements.saleQuantity.value = 1;

        elements.saleItemsCount.textContent =
            "0 منتجات";

        elements.saleTotal.textContent =
            "0 جنيه";


        showNotification(
            `تم تسجيل بيع ${ formatNumber(quantity) } من ${ product.name }.`
        );


        /*
            4 — تحديث التقارير لو الصفحة مفتوحة
        */

        if (state.currentPage === "reports") {
            await renderReports();
        }


    } catch (error) {

        console.error(error);

        showNotification(
            "حدث خطأ أثناء تسجيل عملية البيع."
        );
    }
}


/* =========================================================
   24 — REPORTS
========================================================= */

async function renderReports() {

    if (!elements.reportsList) {
        return;
    }


    const reports =
        await getAll(STORES.REPORTS);


    const visibleReports =
        reports.filter(
            report => !report.hidden
        );


    elements.reportsList.innerHTML = "";


    let totalSold = 0;
    let totalValue = 0;


    visibleReports.forEach(report => {

        totalSold +=
            Number(report.soldCount) || 0;

        totalValue +=
            Number(report.totalValue) || 0;
    });


    elements.totalSoldCount.textContent =
        formatNumber(totalSold);


    elements.totalSalesValue.textContent =
        formatMoney(totalValue);


    if (visibleReports.length === 0) {

        elements.reportsList.innerHTML = `
    < div class="empty-state" >
                <span class="empty-icon">◫</span>
                <h4>لا توجد تقارير</h4>
                <p>ستظهر تقارير المنتجات بعد تسجيل عمليات البيع.</p>
            </ >
    `;

        return;
    }


    visibleReports.forEach(report => {

        const item =
            createReportItem(report);

        elements.reportsList.appendChild(item);
    });


    applyReportSearch();
}


/* =========================================================
   25 — REPORT ITEM
========================================================= */

function createReportItem(report) {

    const item =
        document.createElement("div");

    item.className =
        "report-item";


    const main =
        document.createElement("div");

    main.className =
        "report-item-main";


    const checkbox =
        document.createElement("input");

    checkbox.type = "checkbox";

    checkbox.className =
        "report-checkbox";

    checkbox.dataset.productId =
        report.productId;


    checkbox.checked =
        state.selectedReports.has(
            report.productId
        );


    checkbox.addEventListener(
        "change",
        () => {

            if (checkbox.checked) {

                state.selectedReports.add(
                    report.productId
                );

            } else {

                state.selectedReports.delete(
                    report.productId
                );
            }
        }
    );


    const info =
        document.createElement("div");


    const name =
        document.createElement("h4");

    name.textContent =
        report.productName;


    const price =
        document.createElement("span");

    price.textContent =
        `سعر البيع: ${ formatMoney(report.price) } `;


    info.appendChild(name);
    info.appendChild(price);


    main.appendChild(checkbox);
    main.appendChild(info);


    const statistics =
        document.createElement("div");

    statistics.className =
        "report-statistics";


    const sold =
        document.createElement("span");

    sold.innerHTML =
        `< small > المباع</ > <strong>${formatNumber(report.soldCount)}</strong>`;


    const value =
        document.createElement("span");

    value.innerHTML =
        `< small > الإجمالي</ > <strong>${formatMoney(report.totalValue)}</strong>`;


    statistics.appendChild(sold);
    statistics.appendChild(value);


    const actions =
        document.createElement("div");

    actions.className =
        "report-actions";


    const resetButton =
        document.createElement("button");

    resetButton.type = "button";

    resetButton.className =
        "secondary-button";

    resetButton.textContent =
        "تصفير";


    resetButton.addEventListener(
        "click",
        async () => {

            await resetReport(
                report.productId
            );
        }
    );


    const deleteButton =
        document.createElement("button");

    deleteButton.type = "button";

    deleteButton.className =
        "secondary-button";

    deleteButton.textContent =
        "حذف";


    deleteButton.addEventListener(
        "click",
        async () => {

            await hideReport(
                report.productId
            );
        }
    );


    actions.appendChild(resetButton);
    actions.appendChild(deleteButton);


    item.appendChild(main);
    item.appendChild(statistics);
    item.appendChild(actions);


    return item;
}


/* =========================================================
   26 — RESET ONE REPORT
========================================================= */

async function resetReport(productId) {

    const report =
        await getById(
            STORES.REPORTS,
            productId
        );


    if (!report) {
        return;
    }


    report.soldCount = 0;
    report.totalValue = 0;
    report.hidden = false;


    await putRecord(
        STORES.REPORTS,
        report
    );


    state.selectedReports.delete(
        productId
    );


    await renderReports();


    showNotification(
        "تم تصفير تقرير المنتج."
    );
}


/* =========================================================
   27 — HIDE REPORT
========================================================= */

async function hideReport(productId) {

    const report =
        await getById(
            STORES.REPORTS,
            productId
        );


    if (!report) {
        return;
    }


    /*
        الحذف هنا من التقارير فقط.
        المنتج نفسه لا يتم حذفه.
        وسجل عمليات البيع لا يتم حذفه.
    */

    report.hidden = true;


    await putRecord(
        STORES.REPORTS,
        report
    );


    state.selectedReports.delete(
        productId
    );


    await renderReports();


    showNotification(
        "تم حذف التقرير من قائمة التقارير."
    );
}


/* =========================================================
   28 — RESET SELECTED REPORTS
========================================================= */

async function resetSelectedReports() {

    if (state.selectedReports.size === 0) {

        showNotification(
            "حدد تقريرًا واحدًا على الأقل."
        );

        return;
    }


    const selectedIds =
        Array.from(
            state.selectedReports
        );


    for (const productId of selectedIds) {

        await resetReport(productId);
    }


    state.selectedReports.clear();


    await renderReports();


    showNotification(
        "تم تصفير التقارير المحددة."
    );
}


/* =========================================================
   29 — REPORT SEARCH
========================================================= */

function applyReportSearch() {

    if (!elements.reportSearch) {
        return;
    }


    const search =
        elements.reportSearch.value
            .trim()
            .toLowerCase();


    const items =
        elements.reportsList.querySelectorAll(
            ".report-item"
        );


    items.forEach(item => {

        const text =
            item.textContent.toLowerCase();


        item.style.display =
            text.includes(search)
                ? ""
                : "none";
    });
}


function setupReportSearch() {

    elements.reportSearch?.addEventListener(
        "input",
        applyReportSearch
    );
}


/* =========================================================
   30 — PRODUCT FORM EVENTS
========================================================= */

function setupProductForm() {

    elements.productForm?.addEventListener(
        "submit",
        handleProductSubmit
    );


    /*
        زر "+ تسجيل منتج"

        لأنه في نفس الصفحة أصلًا، نستخدمه فقط
        للانتقال والتركيز على نموذج التسجيل.
    */

    elements.addProductButton?.addEventListener(
        "click",
        () => {

            navigateTo("products");

            elements.productName?.focus();
        }
    );
}


/* =========================================================
   31 — SALES EVENTS
========================================================= */

function setupSales() {

    elements.saleQuantity?.addEventListener(
        "input",
        updateSaleTotal
    );


    elements.confirmSaleButton?.addEventListener(
        "click",
        registerSale
    );
}


/* =========================================================
   32 — REPORT EVENTS
========================================================= */

function setupReports() {

    elements.resetSelectedReportsButton?.addEventListener(
        "click",
        resetSelectedReports
    );
}


/* =========================================================
   33 — CLOSE MOBILE SIDEBAR
========================================================= */

function setupOutsideSidebarClick() {

    document.addEventListener(
        "click",
        event => {

            if (
                window.innerWidth > 768 ||
                !elements.sidebar.classList.contains("open")
            ) {
                return;
            }


            const clickedInsideSidebar =
                elements.sidebar.contains(
                    event.target
                );


            const clickedMenuButton =
                elements.mobileMenuButton?.contains(
                    event.target
                );


            if (
                !clickedInsideSidebar &&
                !clickedMenuButton
            ) {

                elements.sidebar.classList.remove(
                    "open"
                );
            }
        }
    );
}


/* =========================================================
   34 — PUBLIC SCANNER API
========================================================= */

/*
    هذه الواجهة مهمة جدًا للمستقبل.

    عندما نجهز طبقة USB الحقيقية، لا نحتاج لتعديل
    منطق البيع أو المنتجات أو التقارير.

    فقط اجعل طبقة الـUSB تستدعي:

        window.storeCoreScanner.receive("BARCODE");

    مثال:

        window.storeCoreScanner.receive(
            "6221234567890"
        );
*/

window.storeCoreScanner = {

    receive(barcode) {

        return receiveBarcode(barcode);
    },

    connected() {

        state.scannerConnected = true;

        if (elements.scannerStatus) {

            elements.scannerStatus.textContent =
                "متصل";
        }
    },

    disconnected() {

        state.scannerConnected = false;

        if (elements.scannerStatus) {

            elements.scannerStatus.textContent =
                "غير متصل";
        }
    }
};


/* =========================================================
   35 — INITIALIZATION
========================================================= */

async function initializeApp() {

    try {

        await openDatabase();


        setupNavigation();

        setupProductImage();

        setupProductForm();

        setupScannerModal();

        setupKeyboardBarcodeFallback();

        setupSales();

        setupReports();

        setupReportSearch();

        setupOutsideSidebarClick();


        await renderProducts();

        await renderReports();


        navigateTo("products");


        console.log(
            "STORE CORE initialized successfully."
        );


    } catch (error) {

        console.error(
            "STORE CORE initialization error:",
            error
        );


        showNotification(
            "تعذر تشغيل التخزين المحلي."
        );
    }
}


/* =========================================================
   36 — START
========================================================= */

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeApp
    );

} else {

    initializeApp();
}