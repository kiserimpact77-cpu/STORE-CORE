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

let db = null;


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
   03 — DOM ELEMENTS
========================================================= */

const elements = {

    sidebar:
        document.getElementById("sidebar"),

    mobileMenuButton:
        document.getElementById("mobileMenuButton"),

    currentPageName:
        document.getElementById("currentPageName"),

    navItems:
        document.querySelectorAll(".nav-item"),

    pages:
        document.querySelectorAll("[data-page-content]"),


    /* PRODUCTS */

    productForm:
        document.getElementById("productForm"),

    productName:
        document.getElementById("productName"),

    productPrice:
        document.getElementById("productPrice"),

    productBarcode:
        document.getElementById("productBarcode"),

    productImage:
        document.getElementById("productImage"),

    productImagePreview:
        document.getElementById("productImagePreview"),

    productsGrid:
        document.getElementById("productsGrid"),

    productsCount:
        document.getElementById("productsCount"),

    addProductButton:
        document.getElementById("addProductButton"),

    scanProductBarcodeButton:
        document.getElementById("scanProductBarcodeButton"),


    /* SCANNER */

    scannerModal:
        document.getElementById("scannerModal"),

    scannerModalStatus:
        document.getElementById("scannerModalStatus"),

    connectScannerButton:
        document.getElementById("connectScannerButton"),

    scannerStatus:
        document.getElementById("scannerStatus"),


    /* SALES */

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


    /* REPORTS */

    reportsList:
        document.getElementById("reportsList"),

    reportSearch:
        document.getElementById("reportSearch"),

    resetSelectedReportsButton:
        document.getElementById(
            "resetSelectedReportsButton"
        ),

    totalSoldCount:
        document.getElementById("totalSoldCount"),

    totalSalesValue:
        document.getElementById("totalSalesValue"),


    /* NOTIFICATION */

    notification:
        document.getElementById("notification"),

    notificationMessage:
        document.getElementById(
            "notificationMessage"
        )
};


/* =========================================================
   04 — DATABASE INITIALIZATION
========================================================= */

function openDatabase() {

    return new Promise((resolve, reject) => {

        const request =
            indexedDB.open(
                DB_NAME,
                DB_VERSION
            );


        request.onupgradeneeded = function (event) {

            const database =
                event.target.result;


            /* PRODUCTS */

            if (
                !database.objectStoreNames.contains(
                    STORES.PRODUCTS
                )
            ) {

                const productsStore =
                    database.createObjectStore(
                        STORES.PRODUCTS,
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
            }


            /* SALES */

            if (
                !database.objectStoreNames.contains(
                    STORES.SALES
                )
            ) {

                const salesStore =
                    database.createObjectStore(
                        STORES.SALES,
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
                    "createdAt",
                    "createdAt",
                    {
                        unique: false
                    }
                );
            }


            /* REPORTS */

            if (
                !database.objectStoreNames.contains(
                    STORES.REPORTS
                )
            ) {

                database.createObjectStore(
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
   05 — DATABASE CHECK
========================================================= */

function databaseReady() {

    if (!db) {

        showNotification(
            "قاعدة البيانات المحلية غير جاهزة."
        );

        return false;
    }

    return true;
}


/* =========================================================
   06 — DATABASE REQUEST
========================================================= */

function dbRequest(
    storeName,
    mode,
    callback
) {

    return new Promise((resolve, reject) => {

        if (!db) {

            reject(
                new Error(
                    "Database is not initialized."
                )
            );

            return;
        }


        let transaction;

        try {

            transaction =
                db.transaction(
                    storeName,
                    mode
                );

        } catch (error) {

            reject(error);

            return;
        }


        const store =
            transaction.objectStore(
                storeName
            );


        let request;

        try {

            request =
                callback(store);

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


        transaction.onerror = function () {

            reject(
                transaction.error
            );

        };
    });
}


/* =========================================================
   07 — DATABASE HELPERS
========================================================= */

function getAll(storeName) {

    return dbRequest(
        storeName,
        "readonly",
        store => store.getAll()
    );
}


function getById(
    storeName,
    id
) {

    return dbRequest(
        storeName,
        "readonly",
        store => store.get(id)
    );
}


function addRecord(
    storeName,
    data
) {

    return dbRequest(
        storeName,
        "readwrite",
        store => store.add(data)
    );
}


function putRecord(
    storeName,
    data
) {

    return dbRequest(
        storeName,
        "readwrite",
        store => store.put(data)
    );
}


function deleteRecord(
    storeName,
    id
) {

    return dbRequest(
        storeName,
        "readwrite",
        store => store.delete(id)
    );
}


/* =========================================================
   08 — FORMATTING
========================================================= */

function formatMoney(value) {

    const number =
        Number(value) || 0;


    return `${number.toLocaleString("ar-EG")} جنيه`;
}


function formatNumber(value) {

    return Number(value || 0)
        .toLocaleString("ar-EG");
}


/* =========================================================
   09 — NOTIFICATIONS
========================================================= */

let notificationTimer = null;


function showNotification(message) {

    if (
        !elements.notification ||
        !elements.notificationMessage
    ) {

        return;
    }


    elements.notificationMessage.textContent =
        message;


    elements.notification.hidden = false;


    clearTimeout(
        notificationTimer
    );


    notificationTimer =
        setTimeout(() => {

            elements.notification.hidden = true;

        }, 3000);
}


/* =========================================================
   10 — NAVIGATION
========================================================= */

const pageNames = {

    products:
        "تسجيل المنتجات",

    sales:
        "البيع",

    reports:
        "التقارير",

    developer:
        "المطور"
};


function navigateTo(pageName) {

    const targetPage =
        document.querySelector(
            `[data-page-content="${pageName}"]`
        );


    if (!targetPage) {

        return;
    }


    state.currentPage =
        pageName;


    /* تغيير الصفحة */

    elements.pages.forEach(page => {

        page.classList.toggle(
            "active-page",
            page.dataset.pageContent === pageName
        );
    });


    /* تغيير الزر النشط */

    elements.navItems.forEach(item => {

        item.classList.toggle(
            "active",
            item.dataset.page === pageName
        );
    });


    /* اسم الصفحة */

    if (elements.currentPageName) {

        elements.currentPageName.textContent =
            pageNames[pageName] || pageName;
    }


    /* إغلاق القائمة على الهاتف */

    if (elements.sidebar) {

        elements.sidebar.classList.remove(
            "open"
        );
    }


    /*
        تحديث البيانات فقط إذا كانت قاعدة البيانات
        جاهزة.
    */

    if (
        pageName === "products" &&
        db
    ) {

        renderProducts()
            .catch(error => {

                console.error(
                    "Products render error:",
                    error
                );

            });
    }


    if (
        pageName === "reports" &&
        db
    ) {

        renderReports()
            .catch(error => {

                console.error(
                    "Reports render error:",
                    error
                );

            });
    }
}


/* =========================================================
   11 — NAVIGATION SETUP
========================================================= */

function setupNavigation() {

    elements.navItems.forEach(item => {

        item.addEventListener(
            "click",
            () => {

                const page =
                    item.dataset.page;


                navigateTo(page);

            }
        );
    });


    if (elements.mobileMenuButton) {

        elements.mobileMenuButton.addEventListener(
            "click",
            () => {

                if (!elements.sidebar) {
                    return;
                }


                elements.sidebar.classList.toggle(
                    "open"
                );

            }
        );
    }
}


/* =========================================================
   12 — MOBILE SIDEBAR OUTSIDE CLICK
========================================================= */

function setupOutsideSidebarClick() {

    document.addEventListener(
        "click",
        event => {

            if (
                window.innerWidth > 768 ||
                !elements.sidebar ||
                !elements.sidebar.classList.contains("open")
            ) {

                return;
            }


            const clickedInsideSidebar =
                elements.sidebar.contains(
                    event.target
                );


            const clickedMenuButton =
                elements.mobileMenuButton &&
                elements.mobileMenuButton.contains(
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
   13 — PRODUCT IMAGE
========================================================= */

function setupProductImage() {

    if (!elements.productImage) {

        return;
    }


    elements.productImage.addEventListener(
        "change",
        event => {

            const file =
                event.target.files?.[0];


            if (!file) {

                return;
            }


            if (
                !file.type.startsWith(
                    "image/"
                )
            ) {

                showNotification(
                    "الملف المختار ليس صورة."
                );


                elements.productImage.value =
                    "";


                return;
            }


            state.currentProductImage =
                file;


            const reader =
                new FileReader();


            reader.onload = function () {

                if (
                    !elements.productImagePreview
                ) {

                    return;
                }


                elements.productImagePreview.innerHTML =
                    "";


                const image =
                    document.createElement(
                        "img"
                    );


                image.src =
                    reader.result;


                image.alt =
                    "صورة المنتج";


                elements.productImagePreview.appendChild(
                    image
                );
            };


            reader.readAsDataURL(file);
        }
    );
}


/* =========================================================
   14 — BARCODE RECEIVER
========================================================= */

async function receiveBarcode(barcode) {

    barcode =
        String(barcode || "").trim();


    if (!barcode) {

        return;
    }


    /* تسجيل منتج */

    if (
        state.currentPage === "products"
    ) {

        if (elements.productBarcode) {

            elements.productBarcode.value =
                barcode;
        }


        closeScannerModal();


        showNotification(
            "تم تسجيل Barcode للمنتج."
        );


        return;
    }


    /* البيع */

    if (
        state.currentPage === "sales"
    ) {

        await handleSaleBarcode(
            barcode
        );
    }
}


/* =========================================================
   15 — KEYBOARD BARCODE SCANNER
========================================================= */

/*
    دعم أجهزة Barcode Scanner التي تعمل
    مثل لوحة المفاتيح.

    الجهاز يكتب الأرقام ثم يرسل Enter.
*/

let scannerBuffer = "";
let scannerBufferTimer = null;


function setupKeyboardBarcodeFallback() {

    document.addEventListener(
        "keydown",
        event => {

            /*
                تجاهل الكتابة العادية داخل الحقول.
            */

            const activeElement =
                document.activeElement;


            const isTypingField =
                activeElement &&
                (
                    activeElement.tagName === "INPUT" ||
                    activeElement.tagName === "TEXTAREA" ||
                    activeElement.isContentEditable
                );


            /*
                لو المستخدم يكتب داخل input
                لا نتدخل في الكتابة العادية.
            */

            if (isTypingField) {

                return;
            }


            if (
                event.key.length === 1 &&
                /[0-9]/.test(event.key)
            ) {

                scannerBuffer +=
                    event.key;


                clearTimeout(
                    scannerBufferTimer
                );


                scannerBufferTimer =
                    setTimeout(() => {

                        scannerBuffer = "";

                    }, 100);


                return;
            }


            if (
                event.key === "Enter" &&
                scannerBuffer.length >= 4
            ) {

                const barcode =
                    scannerBuffer;


                scannerBuffer = "";


                receiveBarcode(
                    barcode
                );
            }
        }
    );
}


/* =========================================================
   16 — SCANNER MODAL
========================================================= */

function openScannerModal() {

    if (!elements.scannerModal) {

        return;
    }


    elements.scannerModal.hidden =
        false;


    if (
        elements.scannerModalStatus
    ) {

        elements.scannerModalStatus.textContent =
            "في انتظار قراءة Barcode...";
    }
}


function closeScannerModal() {

    if (!elements.scannerModal) {

        return;
    }


    elements.scannerModal.hidden =
        true;
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


    if (elements.scannerModal) {

        elements.scannerModal.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    elements.scannerModal
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
                event.key === "Escape"
            ) {

                closeScannerModal();
            }
        }
    );


    if (
        elements.scanProductBarcodeButton
    ) {

        elements.scanProductBarcodeButton.addEventListener(
            "click",
            () => {

                openScannerModal();

            }
        );
    }


    if (
        elements.connectScannerButton
    ) {

        elements.connectScannerButton.addEventListener(
            "click",
            () => {

                /*
                    هذا الزر يفتح وضع انتظار الـScanner.
                    لا ندعي أن USB اتصل فعليًا.
                */

                showNotification(
                    "تم فتح وضع انتظار الـScanner."
                );


                openScannerModal();
            }
        );
    }
}


/* =========================================================
   17 — PRODUCT FORM
========================================================= */

async function handleProductSubmit(event) {

    event.preventDefault();


    if (!databaseReady()) {

        return;
    }


    const name =
        elements.productName.value.trim();


    const price =
        Number(
            elements.productPrice.value
        );


    const barcode =
        elements.productBarcode.value.trim();


    if (!name) {

        showNotification(
            "اكتب اسم المنتج أولًا."
        );


        elements.productName.focus();


        return;
    }


    if (
        !Number.isFinite(price) ||
        price < 0
    ) {

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


    try {

        const products =
            await getAll(
                STORES.PRODUCTS
            );


        const barcodeExists =
            products.some(
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
                state.currentProductImage ||
                null,

            createdAt:
                new Date().toISOString()
        };


        const productId =
            await addRecord(
                STORES.PRODUCTS,
                product
            );


        product.id =
            productId;


        await ensureReportExists(
            product
        );


        resetProductForm();


        await renderProducts();


        showNotification(
            "تم تسجيل المنتج بنجاح."
        );

    } catch (error) {

        console.error(
            "Product registration error:",
            error
        );


        showNotification(
            "حدث خطأ أثناء تسجيل المنتج."
        );
    }
}


/* =========================================================
   18 — RESET PRODUCT FORM
========================================================= */

function resetProductForm() {

    elements.productForm?.reset();


    state.currentProductImage =
        null;


    if (elements.productBarcode) {

        elements.productBarcode.value =
            "";
    }


    if (
        elements.productImagePreview
    ) {

        elements.productImagePreview.innerHTML =
            "<span>صورة المنتج</span>";
    }
}


/* =========================================================
   19 — RENDER PRODUCTS
========================================================= */

async function renderProducts() {

    if (!elements.productsGrid) {

        return;
    }


    if (!databaseReady()) {

        return;
    }


    const products =
        await getAll(
            STORES.PRODUCTS
        );


    elements.productsGrid.innerHTML =
        "";


    if (elements.productsCount) {

        elements.productsCount.textContent =
            `${formatNumber(products.length)} منتج`;
    }


    if (products.length === 0) {

        elements.productsGrid.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">▣</span>
                <h4>لا توجد منتجات</h4>
                <p>ابدأ بتسجيل أول منتج.</p>
            </div>
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
                createProductCard(
                    product
                );


            elements.productsGrid.appendChild(
                card
            );
        });
}


/* =========================================================
   20 — PRODUCT CARD
========================================================= */

function createProductCard(product) {

    const card =
        document.createElement(
            "article"
        );


    card.className =
        "product-card";


    const imageArea =
        document.createElement(
            "div"
        );


    imageArea.className =
        "product-card-image";


    if (product.image) {

        const image =
            document.createElement(
                "img"
            );


        const objectUrl =
            URL.createObjectURL(
                product.image
            );


        image.src =
            objectUrl;


        image.alt =
            product.name;


        image.onload = () => {

            URL.revokeObjectURL(
                objectUrl
            );
        };


        imageArea.appendChild(
            image
        );

    } else {

        imageArea.innerHTML =
            "<span>بدون صورة</span>";
    }


    const content =
        document.createElement(
            "div"
        );


    content.className =
        "product-card-content";


    const name =
        document.createElement(
            "h4"
        );


    name.textContent =
        product.name;


    const price =
        document.createElement(
            "strong"
        );


    price.textContent =
        formatMoney(
            product.price
        );


    const barcode =
        document.createElement(
            "span"
        );


    barcode.textContent =
        `Barcode: ${product.barcode}`;


    barcode.className =
        "product-card-barcode";


    content.appendChild(
        name
    );


    content.appendChild(
        price
    );


    content.appendChild(
        barcode
    );


    card.appendChild(
        imageArea
    );


    card.appendChild(
        content
    );


    return card;
}


/* =========================================================
   21 — CREATE PRODUCT REPORT
========================================================= */

async function ensureReportExists(
    product
) {

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

            productId:
                product.id,

            productName:
                product.name,

            price:
                product.price,

            soldCount:
                0,

            totalValue:
                0,

            hidden:
                false,

            createdAt:
                new Date().toISOString()
        }
    );
}


/* =========================================================
   22 — FIND PRODUCT BY BARCODE
========================================================= */

async function findProductByBarcode(
    barcode
) {

    const products =
        await getAll(
            STORES.PRODUCTS
        );


    return (
        products.find(
            product =>
                product.barcode === barcode
        ) || null
    );
}


/* =========================================================
   23 — HANDLE SALE BARCODE
========================================================= */

async function handleSaleBarcode(
    barcode
) {

    if (!databaseReady()) {

        return;
    }


    const product =
        await findProductByBarcode(
            barcode
        );


    if (!product) {

        showNotification(
            "هذا الـBarcode غير مسجل."
        );


        return;
    }


    state.currentSaleProduct =
        product;


    renderSaleProduct(
        product
    );


    showNotification(
        `تم العثور على ${product.name}.`
    );
}


/* =========================================================
   24 — RENDER SALE PRODUCT
========================================================= */

function renderSaleProduct(
    product
) {

    if (
        !elements.saleProductPreview
    ) {

        return;
    }


    elements.saleProductPreview.innerHTML =
        "";


    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "sale-product-result";


    if (product.image) {

        const image =
            document.createElement(
                "img"
            );


        const objectUrl =
            URL.createObjectURL(
                product.image
            );


        image.src =
            objectUrl;


        image.alt =
            product.name;


        image.onload = () => {

            URL.revokeObjectURL(
                objectUrl
            );
        };


        wrapper.appendChild(
            image
        );
    }


    const info =
        document.createElement(
            "div"
        );


    info.className =
        "sale-product-info";


    const name =
        document.createElement(
            "h4"
        );


    name.textContent =
        product.name;


    const price =
        document.createElement(
            "strong"
        );


    price.textContent =
        formatMoney(
            product.price
        );


    const barcode =
        document.createElement(
            "span"
        );


    barcode.textContent =
        product.barcode;


    info.appendChild(
        name
    );


    info.appendChild(
        price
    );


    info.appendChild(
        barcode
    );


    wrapper.appendChild(
        info
    );


    elements.saleProductPreview.appendChild(
        wrapper
    );


    if (elements.quantitySection) {

        elements.quantitySection.hidden =
            false;
    }


    if (elements.saleQuantity) {

        elements.saleQuantity.value =
            1;
    }


    if (elements.saleItemsCount) {

        elements.saleItemsCount.textContent =
            "1 منتج";
    }


    updateSaleTotal();
}


/* =========================================================
   25 — SALE TOTAL
========================================================= */

function updateSaleTotal() {

    const product =
        state.currentSaleProduct;


    if (!product) {

        if (elements.saleTotal) {

            elements.saleTotal.textContent =
                "0 جنيه";
        }


        return;
    }


    let quantity =
        Number(
            elements.saleQuantity?.value
        );


    if (
        !Number.isInteger(quantity) ||
        quantity < 1
    ) {

        quantity = 1;
    }


    const total =
        product.price * quantity;


    if (elements.saleTotal) {

        elements.saleTotal.textContent =
            formatMoney(total);
    }
}


/* =========================================================
   26 — REGISTER SALE
========================================================= */

async function registerSale() {

    if (!databaseReady()) {

        return;
    }


    const product =
        state.currentSaleProduct;


    if (!product) {

        showNotification(
            "امسح Barcode المنتج أولًا."
        );


        return;
    }


    const quantity =
        Number(
            elements.saleQuantity.value
        );


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

        productId:
            product.id,

        productName:
            product.name,

        barcode:
            product.barcode,

        unitPrice:
            product.price,

        quantity,

        total,

        createdAt:
            new Date().toISOString()
    };


    try {

        /* حفظ عملية البيع */

        await addRecord(
            STORES.SALES,
            sale
        );


        /* تحديث التقرير */

        let report =
            await getById(
                STORES.REPORTS,
                product.id
            );


        if (!report) {

            report = {

                productId:
                    product.id,

                productName:
                    product.name,

                price:
                    product.price,

                soldCount:
                    0,

                totalValue:
                    0,

                hidden:
                    false,

                createdAt:
                    new Date().toISOString()
            };
        }


        report.productName =
            product.name;


        report.price =
            product.price;


        report.soldCount =
            (Number(report.soldCount) || 0) +
            quantity;


        report.totalValue =
            (Number(report.totalValue) || 0) +
            total;


        report.hidden =
            false;


        await putRecord(
            STORES.REPORTS,
            report
        );


        /* تنظيف البيع الحالي */

        state.currentSaleProduct =
            null;


        if (
            elements.saleProductPreview
        ) {

            elements.saleProductPreview.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">✓</span>
                    <h4>تم تسجيل البيع</h4>
                    <p>يمكنك مسح Barcode آخر.</p>
                </div>
            `;
        }


        if (elements.quantitySection) {

            elements.quantitySection.hidden =
                true;
        }


        if (elements.saleQuantity) {

            elements.saleQuantity.value =
                1;
        }


        if (elements.saleItemsCount) {

            elements.saleItemsCount.textContent =
                "0 منتجات";
        }


        if (elements.saleTotal) {

            elements.saleTotal.textContent =
                "0 جنيه";
        }


        showNotification(
            `تم تسجيل بيع ${formatNumber(quantity)} من ${product.name}.`
        );


        /*
            إذا كانت صفحة التقارير مفتوحة
            يتم تحديثها مباشرة.
        */

        if (
            state.currentPage === "reports"
        ) {

            await renderReports();
        }

    } catch (error) {

        console.error(
            "Sale registration error:",
            error
        );


        showNotification(
            "حدث خطأ أثناء تسجيل عملية البيع."
        );
    }
}


/* =========================================================
   27 — RENDER REPORTS
========================================================= */

async function renderReports() {

    if (!elements.reportsList) {

        return;
    }


    if (!databaseReady()) {

        return;
    }


    const reports =
        await getAll(
            STORES.REPORTS
        );


    const visibleReports =
        reports.filter(
            report =>
                !report.hidden
        );


    elements.reportsList.innerHTML =
        "";


    let totalSold = 0;

    let totalValue = 0;


    visibleReports.forEach(
        report => {

            totalSold +=
                Number(
                    report.soldCount
                ) || 0;


            totalValue +=
                Number(
                    report.totalValue
                ) || 0;
        }
    );


    if (elements.totalSoldCount) {

        elements.totalSoldCount.textContent =
            formatNumber(totalSold);
    }


    if (elements.totalSalesValue) {

        elements.totalSalesValue.textContent =
            formatMoney(totalValue);
    }


    if (
        visibleReports.length === 0
    ) {

        elements.reportsList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">◫</span>
                <h4>لا توجد تقارير</h4>
                <p>ستظهر تقارير المنتجات بعد تسجيل عمليات البيع.</p>
            </div>
        `;


        return;
    }


    visibleReports.forEach(
        report => {

            const item =
                createReportItem(
                    report
                );


            elements.reportsList.appendChild(
                item
            );
        }
    );


    applyReportSearch();
}


/* =========================================================
   28 — CREATE REPORT ITEM
========================================================= */

function createReportItem(
    report
) {

    const item =
        document.createElement(
            "div"
        );


    item.className =
        "report-item";


    /* Main */

    const main =
        document.createElement(
            "div"
        );


    main.className =
        "report-item-main";


    /* Checkbox */

    const checkbox =
        document.createElement(
            "input"
        );


    checkbox.type =
        "checkbox";


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


    /* Product info */

    const info =
        document.createElement(
            "div"
        );


    const name =
        document.createElement(
            "h4"
        );


    name.textContent =
        report.productName;


    const price =
        document.createElement(
            "span"
        );


    price.textContent =
        `سعر البيع: ${formatMoney(report.price)}`;


    info.appendChild(
        name
    );


    info.appendChild(
        price
    );


    main.appendChild(
        checkbox
    );


    main.appendChild(
        info
    );


    /* Statistics */

    const statistics =
        document.createElement(
            "div"
        );


    statistics.className =
        "report-statistics";


    const sold =
        document.createElement(
            "span"
        );


    const soldLabel =
        document.createElement(
            "small"
        );


    soldLabel.textContent =
        "المباع";


    const soldValue =
        document.createElement(
            "strong"
        );


    soldValue.textContent =
        formatNumber(
            report.soldCount
        );


    sold.appendChild(
        soldLabel
    );


    sold.appendChild(
        soldValue
    );


    const value =
        document.createElement(
            "span"
        );


    const valueLabel =
        document.createElement(
            "small"
        );


    valueLabel.textContent =
        "الإجمالي";


    const valueAmount =
        document.createElement(
            "strong"
        );


    valueAmount.textContent =
        formatMoney(
            report.totalValue
        );


    value.appendChild(
        valueLabel
    );


    value.appendChild(
        valueAmount
    );


    statistics.appendChild(
        sold
    );


    statistics.appendChild(
        value
    );


    /* Actions */

    const actions =
        document.createElement(
            "div"
        );


    actions.className =
        "report-actions";


    /* Reset */

    const resetButton =
        document.createElement(
            "button"
        );


    resetButton.type =
        "button";


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


    /* Delete report */

    const deleteButton =
        document.createElement(
            "button"
        );


    deleteButton.type =
        "button";


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


    actions.appendChild(
        resetButton
    );


    actions.appendChild(
        deleteButton
    );


    /* Final item */

    item.appendChild(
        main
    );


    item.appendChild(
        statistics
    );


    item.appendChild(
        actions
    );


    return item;
}


/* =========================================================
   29 — RESET ONE REPORT
========================================================= */

async function resetReport(
    productId
) {

    if (!databaseReady()) {

        return;
    }


    try {

        const report =
            await getById(
                STORES.REPORTS,
                productId
            );


        if (!report) {

            return;
        }


        report.soldCount =
            0;


        report.totalValue =
            0;


        report.hidden =
            false;


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

    } catch (error) {

        console.error(
            "Reset report error:",
            error
        );


        showNotification(
            "حدث خطأ أثناء تصفير التقرير."
        );
    }
}


/* =========================================================
   30 — HIDE REPORT
========================================================= */

async function hideReport(
    productId
) {

    if (!databaseReady()) {

        return;
    }


    try {

        const report =
            await getById(
                STORES.REPORTS,
                productId
            );


        if (!report) {

            return;
        }


        /*
            الحذف هنا من قائمة التقارير فقط.

            المنتج نفسه لا يتم حذفه.
            وعمليات البيع لا يتم حذفها.
        */

        report.hidden =
            true;


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

    } catch (error) {

        console.error(
            "Hide report error:",
            error
        );


        showNotification(
            "حدث خطأ أثناء حذف التقرير."
        );
    }
}


/* =========================================================
   31 — RESET SELECTED REPORTS
========================================================= */

async function resetSelectedReports() {

    if (
        state.selectedReports.size === 0
    ) {

        showNotification(
            "حدد تقريرًا واحدًا على الأقل."
        );


        return;
    }


    if (!databaseReady()) {

        return;
    }


    const selectedIds =
        Array.from(
            state.selectedReports
        );


    try {

        for (
            const productId
            of selectedIds
        ) {

            const report =
                await getById(
                    STORES.REPORTS,
                    productId
                );


            if (!report) {

                continue;
            }


            report.soldCount =
                0;


            report.totalValue =
                0;


            report.hidden =
                false;


            await putRecord(
                STORES.REPORTS,
                report
            );
        }


        state.selectedReports.clear();


        await renderReports();


        showNotification(
            "تم تصفير التقارير المحددة."
        );

    } catch (error) {

        console.error(
            "Reset selected reports error:",
            error
        );


        showNotification(
            "حدث خطأ أثناء تصفير التقارير."
        );
    }
}


/* =========================================================
   32 — REPORT SEARCH
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


    items.forEach(
        item => {

            const text =
                item.textContent.toLowerCase();


            item.style.display =
                text.includes(search)
                    ? ""
                    : "none";
        }
    );
}


function setupReportSearch() {

    if (!elements.reportSearch) {

        return;
    }


    elements.reportSearch.addEventListener(
        "input",
        applyReportSearch
    );
}


/* =========================================================
   33 — PRODUCT FORM EVENTS
========================================================= */

function setupProductForm() {

    if (elements.productForm) {

        elements.productForm.addEventListener(
            "submit",
            handleProductSubmit
        );
    }


    if (elements.addProductButton) {

        elements.addProductButton.addEventListener(
            "click",
            () => {

                navigateTo(
                    "products"
                );


                elements.productName?.focus();
            }
        );
    }
}


/* =========================================================
   34 — SALES EVENTS
========================================================= */

function setupSales() {

    if (elements.saleQuantity) {

        elements.saleQuantity.addEventListener(
            "input",
            updateSaleTotal
        );
    }


    if (elements.confirmSaleButton) {

        elements.confirmSaleButton.addEventListener(
            "click",
            registerSale
        );
    }
}


/* =========================================================
   35 — REPORT EVENTS
========================================================= */

function setupReports() {

    if (
        elements.resetSelectedReportsButton
    ) {

        elements.resetSelectedReportsButton.addEventListener(
            "click",
            resetSelectedReports
        );
    }
}


/* =========================================================
   36 — PUBLIC SCANNER API
========================================================= */

/*
    أي Scanner حقيقي في المستقبل
    يمكنه إرسال Barcode إلى النظام عن طريق:

        window.storeCoreScanner.receive("BARCODE");

    مثال:

        window.storeCoreScanner.receive(
            "6221234567890"
        );
*/

window.storeCoreScanner = {

    receive(barcode) {

        return receiveBarcode(
            barcode
        );
    },


    connected() {

        state.scannerConnected =
            true;


        if (elements.scannerStatus) {

            elements.scannerStatus.textContent =
                "متصل";
        }
    },


    disconnected() {

        state.scannerConnected =
            false;


        if (elements.scannerStatus) {

            elements.scannerStatus.textContent =
                "غير متصل";
        }
    }
};


/* =========================================================
   37 — INTERFACE INITIALIZATION
========================================================= */

/*
    مهم:

    إعداد الواجهة يحدث أولًا.

    القائمة الجانبية والأزرار لا تعتمد
    على نجاح IndexedDB.
*/

function initializeInterface() {

    setupNavigation();

    setupProductImage();

    setupProductForm();

    setupScannerModal();

    setupKeyboardBarcodeFallback();

    setupSales();

    setupReports();

    setupReportSearch();

    setupOutsideSidebarClick();


    /*
        الصفحة الافتراضية
        تعمل فورًا.
    */

    navigateTo(
        "products"
    );
}


/* =========================================================
   38 — DATABASE INITIALIZATION
========================================================= */

async function initializeDatabase() {

    try {

        await openDatabase();


        /*
            بعد نجاح IndexedDB
            نحمل البيانات الموجودة.
        */

        await renderProducts();

        await renderReports();


        console.log(
            "STORE CORE database initialized successfully."
        );

    } catch (error) {

        console.error(
            "STORE CORE database initialization error:",
            error
        );


        showNotification(
            "تعذر تشغيل التخزين المحلي."
        );
    }
}


/* =========================================================
   39 — APPLICATION START
========================================================= */

async function initializeApp() {

    /*
        الخطوة الأولى:
        تشغيل الواجهة والقائمة.
    */

    initializeInterface();


    /*
        الخطوة الثانية:
        تشغيل قاعدة البيانات بشكل مستقل.
    */

    await initializeDatabase();


    console.log(
        "STORE CORE initialized successfully."
    );
}


/* =========================================================
   40 — START
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