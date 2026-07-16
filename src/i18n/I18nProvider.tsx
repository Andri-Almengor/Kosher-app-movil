import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "@/lib/api/client";
import { ENV } from "@/config/env";
import { getI18nDict, initOfflineDb, saveI18nDict } from "@/offline/sqliteStore";

export type Lang = "es" | "en";

const STORAGE_KEY = "kccr.lang";
const CACHE_KEY_PREFIX = "kccr.i18n.cache:";
const I18N_LAST_FETCH_PREFIX = "kccr.i18n.lastFetch:";
const I18N_FETCH_COOLDOWN_MS = 5 * 60_000;

/**
 * Fallback local translations (solo por seguridad / offline).
 * La prioridad real es:
 * 1) DB (backend) -> 2) cache local -> 3) fallback local -> 4) key tal cual
 */
const fallback = {
  es: {
    appTitle: "Kosher Costa Rica",
    searchPlaceholder: "Buscar productos...",
    products: "Productos",
    news: "Novedades",
    advertise: "Anúnciate",
    donations: "Donaciones",
    home: "Inicio",
    spanish: "Español",
    english: "English",
    donateCtaTitle: "Apoye la Supervisión kosher",
    donateNow: "Donar ahora",
    chooseAmount: "Elegir monto",
    amigosLargeAmounts: "Montos mayores a $5000",
    amigosTaxDeductible: "Opción por medio de Amigos de Costa Rica, deducibles de impuestos en Estados Unidos",
    donationOpenError: "No se pudo abrir el enlace de donación.",
    donationsVisualOnly: "Vista de Donaciones (solo visual)",
    kosherListTitle: "Lista de Productos Kosher Autorizados",
    pesajTitle: "Kosher de Pesaj",
    pesajSubtitle: "Consulte el Listado Oficial Autorizado",
    categories: "Categorías",
    // Home cards
    home_products_title: "Productos Kosher",
    home_products_subtitle: "Consulte el Listado Oficial Autorizado",
    home_products_button: "Ver Productos",
    home_news_title: "Novedades",
    home_news_subtitle: "Actualizaciones y Avisos Importantes",
    home_news_button: "Ver novedades",
    home_ad_title: "Anunciantes",
    home_ad_subtitle: "Promociones y Publicaciones Destacadas",
    home_ad_button: "Ver Anunciantes",
    home_donations_title: "Donaciones",
    home_donations_subtitle: "Apoye la Labor de Suspervisión Kosher",
    home_donations_button: "Donar",
    // Common UI
    loadingProducts: "Cargando Productos…",
    backendErrorTitle: "No se pudo conectar al backend.",
    backendErrorHelp: "La app reintentará automáticamente.",
    productCountSuffix: "Productos",
    // Navigation titles
    detail: "Detalle",
    stores: "Tiendas",
    favorites: "Guardados",
    calendar: "Calendario",
    adminAccess: "Acceso Admin",
    adminProfile: "Perfil Administrador",
    drawerAboutUs: "Somos",
    drawerWhatIsKashrut: "¿Qué es Kosher?",
    drawerSupervisionCriteria: "Supervisión y Criterios",
    drawerHome: "Inicio",
    drawerAdmin: "Administrador",
    drawerContact: "Contacto",
    drawerPlaceholderText: "Información Disponible",
    drawerContactInfo: "Email: certificacioneskosher@centroisraelita.com\nTeléfono: 2520-1013 ext. 117",
    drawerDonationText: "",
    drawerContactQuickActionsTitle: "Contacto",
    drawerContactQuickActionsBody: "Seleccione una opción.",
    drawerContactCallAction: "Llamar al",
    drawerContactEmailAction: "Enviar correo",
    drawerAboutInfo: "Esta aplicación es una iniciativa del Centro Israelita de Costa Rica, comunidad Ortodoxa, institución que promueve la vida judía y el kashrut en Costa Rica, todo bajo la guía del Rabino Ytzhak Prober, rabino principal.",
    logout: "Cerrar Sesión",
    adminOnly: "Solo Administradores",
    errorLoad: "No se Pudo cargar.",
    errorTitle: "Error",
    retry: "Reintentar",
    noResults: "No hay resultados.",
    checkBackendToken: "Revisá el backend y el token.",
    cancel: "Cancelar",
    apply: "Aplicar",
    clear: "Limpiar",
    filterByDate: "Filtrar por fecha",
    save: "Guardar",
    import: "Importar",
    export: "Exportar",
    users: "Usuarios",
    adminTitle: "Administrar",
    adminCalendarTitle: "Calendario (Admin)",
    adminEventTitle: "Evento",
    adminDashboard: "Panel de Control",
    adminZone: "Zona de Administración",
    adminChooseManage: "Elige qué Deseas Gestionar en la Aplicación.",
    adminProductsDesc: "Crear, Editar, Eliminar, Importar/Exportar",
    basicInfo: "Información básica",
    certification: "Certificación",
    attributes: "Atributos",
    adminNewsDesc: "Publicaciones, Adjuntos y Enlaces",
    adminLogsDesc: "Ver y Exportar logs del API",
    admins: "Administradores",
    homeKosherList: "Listado Kosher",
    // Títulos debajo de la barra de búsqueda
    newsKashrutTitle: "Novedades Kosher",
    advertiseHere: "¡Anúnciate Aquí!",
    // HomeCard en Productos (filtro rápido)
    home_veg_title: "Kosher de Pesaj",
    home_veg_subtitle: "Consulte el Listado Oficial Autorizado",
    home_veg_button: "Ver Productos",
    home_passover_button: "Pesaj Autorizado",
    home_liquors_button: "Licores Kosher",
    // Posts
    untitled: "(Sin título)",
    openAttachment: "Abrir Adjunto",
    couldNotOpenLink: "No se pudo abrir el enlace.",
    linkNotAvailable: "Enlace no disponible.",
    createEvent: "Crear Evento",
    noEventsYet: "Aún no hay Eventos.",
    noNewsYet: "Aún no hay Novedades.",
    noAdsYet: "No hay Anunciantes Todavía.",
    description: "Descripción",
    location: "Ubicación",
    locationLabel: "Ubicación",
    allDay: "Todo el Día",
    start: "Inicio",
    endOptional: "Fin (opcional)",
    removeEnd: "Quitar Fin",
    preview: "Vista Previa:",
    titleRequired: "Título *",
    title: "Título",
    content: "Contenido",
    destination: "Destino",
    advertisers: "Anunciantes",
    adminPosts: "Posts (Admin)",
    newPost: "New post",
    editPost: "Edit post",
    newPost: "Nuevo post",
    editPost: "Editar post",
    optional: "opcional",
    fileUrlOptional: "fileUrl (opcional)",
    imageUrlOptional: "imageUrl (opcional)",
    // Filters / UI
    filters: "Filtros",
    filterBy: "Filtrar Por",
    filtersActive: "Tenés Filtros Activos",
    filtersNone: "Sin Filtros Activos",
    filtersHint: "Elegí uno o Varios Filtros y Aplica los Cambios.",
    labelCategory: "Categoría",
    labelBrand: "Marca",
    filterHintApply: "Ajusta lo que Necesites y Presiona “Aplicar”.",
    donationLinkLabel: "Utiliza el Siguiente Link para Donativos:",
    donateHere: "Donar aquí",

    // Admin products form/alerts
    done: "Listo",
    error: "Error",
    saving: "Guardando…",
    updating: "Actualizando…",
    newProduct: "Nuevo Producto",
    editProduct: "Editar Producto",
    confirmDelete: "¿Eliminar",
    requiredFields: "Campos Requeridos",
    requiredFieldsProductsMsg: "Completa catGeneral, categoria1, fabricanteMarca y nombre.",
    productCreated: "Producto Creado",
    productUpdated: "Producto Actualizado",
    productDeleted: "Producto Eliminado",
    couldNotCreateProduct: "No se pudo rear el producto.",
    couldNotUpdateProduct: "No se pudo actualizar el producto.",
    couldNotDeleteProduct: "No se pudo eliminar el producto.",
    couldNotDelete: "No se Pudo Eliminar.",
    importCompleted: "Importación Completada",
    importFailed: "Importación Fallida",
    exportFailed: "Exportación Fallida",
    fileCreated: "Archivo Creado",
    savedAt: "Guardado en",
    permissionDenied: "Permiso Denegado",
    deleteEventTitle: "Eliminar Evento",

    // Logs / backend URL
    logs: "Logs",
    exportLogs: "Exportar logs",
    clearLogs: "Limpiar logs",
    backendUrl: "Backend (URL)",
    saveBackendUrl: "Backend Actualizado",
    resetBackendUrl: "Backend Restaurado",
    reset: "Restablecer",

    // Products fields
    catGeneral: "Cat.General",
    categoria1: "Sub Categoria",
    fabricanteMarca: "Marca",
    atributo1: "Status",
    atributo2: "Especiales",
    atributo3: "Atributo 3",
    tienda: "Tienda",
    selloOptional: "Sello/Autoriza",
    certificaOptional: "Condicion",

    results: "Resultados",
    search: "Buscar",
    select: "Seleccionar…",
    seeMore: "Ver más",
    donateCtaBody: "Su Aporte Contribuye al Mantenimiento y Fortalecimiento de la Labor de Supervisión Kosher en Costa Rica",
    eventsAgenda: "Eventos / agenda",
    eventsRegistered: "Eventos Registrados",
    noImage: "Sin imagen",
    certifiesLabel: "Certifica",
    storeLabel: "Tienda",
    removeFromFavorites: "Quitar de Favoritos",
    saveProduct: "GuardarProducto",
    sealAndCertification: "Sello y Certificación",
    productInfo: "Información del Producto",
    policyLawLabel: "Política / ley",
    priceLabel: "Precio / pesaj",
    languageLabel: "Idioma",
    languageFlagsHelp: "Usa Banderas para Cambiar",
    offlineImagesLabel: "Contenido Offline",
    offlineImagesActiveSummary: "Activas · {{count}} archivos",
    offlineImagesDownloadPrompt: "Descargar contenido offline",
    offlineImagesDownloadStartedTitle: "Descarga Iniciada",
    offlineImagesDownloadStartedBody: "La app comenzará a guardar productos, novedades, restaurantes, imágenes, archivos adjuntos y traducciones dinámicas para mejorar el uso sin internet.",
    offlineImagesError: "No se pudo actualizar el modo offline.",
    offlineImagesProgressSummary: "Descargando {{downloaded}}/{{total}} ({{percent}}%)",
    refresh: "Refrescar",
    backHome: "Ir al inicio",
    yesterday: "Ayer",
    date: "Fecha",
    noNewsPublishedToday: "Aún no se han publicado novedades.",
    noAdsPublishedToday: "Aún no se han publicado anuncios.",
    noItemsForSelectedDate: "No hay publicaciones para la fecha seleccionada.",
    offlineImagesPromptTitle: "Descarga en segundo plano",
    offlineImagesPromptBody: "¿Deseas descargar las imágenes de productos en una carpeta local del teléfono para que la carga sea más rápida y funcione mejor sin internet?",
    offlineDataLabel: "Datos offline",
    offlineDataHint: "Borra la base de datos local descargada, las imágenes offline y el contenido preparado para usar sin internet.",
    offlineDataDeleteTitle: "Eliminar datos offline",
    offlineDataDeleteBody: "Esto borrará la caché local descargada y las imágenes guardadas. Si no tienes internet, la app quedará sin esos datos hasta volver a sincronizar.\n\n¿Deseas continuar?",
    offlineDataDeletedAndSynced: "Caché borrada y sincronizada.",
    offlineDataDeletedOffline: "Caché borrada. Estás sin internet: sincroniza cuando vuelvas a estar en línea.",
    notNow: "Ahora no",
    download: "Descargar",
    userCreated: "Usuario creado.",
    userUpdated: "Usuario actualizado.",
    userDeleted: "Usuario eliminado.",
    couldNotCreateUser: "No se pudo crear el usuario.",
    couldNotUpdateUser: "No se pudo actualizar el usuario.",
    couldNotDeleteUser: "No se pudo eliminar el usuario.",
    requiredFieldsUsersMsg: "Nombre, email y contraseña son obligatorios para crear el usuario.",
    deleteUser: "Eliminar usuario",
    delete: "Eliminar",
    adminSessionRequired: "Tu sesión de administrador expiró o aún no se restauró. Vuelve a iniciar sesión.",
    noUsersYet: "Aún no hay usuarios.",
    noProductsYet: "Aún no hay productos.",
    name: "Nombre",
    nombre: "Nombre",
    email: "Correo",
    password: "Contraseña",
    passwordOptional: "Contraseña (opcional)",
    passwordKeepHint: "Déjalo vacío para conservar la actual.",
    newAdmin: "Nuevo administrador",
    editAdmin: "Editar administrador",
    adminCreateHint: "Crea un nuevo usuario administrador.",
    adminEditHint: "Actualiza los datos del administrador.",
    loginRequiredFields: "Ingresa correo y contraseña.",
    accessDenied: "Acceso denegado",
    adminOnlyAccess: "Este acceso es solo para administradores.",
    couldNotLogin: "No se pudo iniciar sesión",
    profile: "Perfil",
    role: "Rol",
    login: "Entrar",
    adminAccessHelp: "Mantén presionado el logo 5 segundos para abrir este acceso.",
    restaurantsTab: "Comercios",
    restaurantsTitle: "Restaurantes y Comercios",
    restaurant: "Restaurante",
    restaurantsSearchPlaceholder: "Buscar restaurante, Comercio o ubicación...",
    home_restaurants_title: "Restaurantes y Comercios",
    home_restaurants_subtitle: "Locales, horarios y medios de contacto autorizados",
    home_restaurants_button: "Ver restaurantes",
    advertisersTitle: "Anunciantes",
    all: "Todos",
    notifyUsers: "Notificar a los usuarios",
    notifyUsersHelp: "Muestra una alerta dentro de la app y una notificación local cuando se publique esta novedad.",
    moreInformation: "Más información",
    loadingRestaurants: "Cargando restaurantes…",
    noRestaurantsYet: "Aún no hay restaurantes o comercios.",
    about: "Acerca de",
    businessHours: "Horario de atención",
    contact: "Contacto",
    contactMethods: "Medios de contacto",
    phone: "Teléfono",
    whatsapp: "WhatsApp",
    callNow: "Llamar ahora",
    openWhatsApp: "Abrir WhatsApp",
    sendEmail: "Enviar correo",
    address: "Dirección",
    openLocation: "Abrir ubicación",
    openInMaps: "Abrir en Maps",
    adminRestaurantsDesc: "Locales, horarios, medios de contacto y detalle bilingüe",
    restaurantSaved: "Restaurante o comercio creado.",
    restaurantUpdated: "Restaurante o comercio actualizado.",
    restaurantDeleted: "Restaurante o comercio eliminado.",
    couldNotSaveRestaurant: "No se pudo guardar el restaurante o comercio.",
    restaurantRequiredFields: "Nombre y tipo de comercio en español son obligatorios.",
    newRestaurant: "Nuevo restaurante o comercio",
    editRestaurant: "Editar restaurante o comercio",
    restaurantNameEs: "Nombre restaurante o comercio (ES)",
    restaurantNameEn: "Nombre restaurante o comercio (EN)",
    businessTypeEs: "Tipo de comercio (ES)",
    businessTypeEn: "Tipo de comercio (EN)",
    restaurantImage: "Imagen del local",
    locationEs: "Ubicación (ES)",
    locationEn: "Ubicación (EN)",
    aboutEs: "Acerca de (ES)",
    aboutEn: "Acerca de (EN)",
    businessHoursEs: "Horario de atención (ES)",
    businessHoursEn: "Horario de atención (EN)",
    phoneValueLabel: "Teléfono",
    phoneDescriptionEs: "Descripción de teléfono (ES)",
    phoneDescriptionEn: "Descripción de teléfono (EN)",
    whatsappValueLabel: "WhatsApp",
    whatsappDescriptionEs: "Descripción de WhatsApp (ES)",
    whatsappDescriptionEn: "Descripción de WhatsApp (EN)",
    emailValueLabel: "Correo",
    emailDescriptionEs: "Descripción de correo (ES)",
    emailDescriptionEn: "Descripción de correo (EN)",
    contactEs: "Contacto (ES)",
    contactEn: "Contacto (EN)",
    addressEs: "Dirección (ES)",
    addressEn: "Dirección (EN)",
    addressLink: "Link de dirección",
    adminRestaurantsSummaryTitle: "Gestión de restaurantes",
    adminRestaurantsSummaryCopy: "Se reorganizó la vista para que editar, ocultar o eliminar sea más cómodo desde el teléfono.",
    businessCountLabel: "locales",
    visibleLabel: "Visible",
    hiddenLabel: "Oculto",
    restaurantsAutofillCopy: "Autocompleta EN en campos descriptivos y reutiliza traducciones existentes para nombre y tipo.",
    englishFieldsAutofilled: "Campos en inglés autocompletados.",
    englishFieldsAutofillError: "No se pudieron autocompletar los campos en inglés.",
    relatedNewsHidden: "También se ocultaron {{count}} novedades relacionadas.",
    relatedNewsShown: "También se volvieron a mostrar {{count}} novedades relacionadas.",
},
  en: {
    appTitle: "Kosher Costa Rica",
    searchPlaceholder: "Search products...",
    products: "Products",
    news: "News",
    advertise: "Advertise",
    donations: "Donations",
    home: "Home",
    spanish: "Spanish",
    english: "English",
    donateCtaTitle: "Support Kosher supervision",
    donateNow: "Donate now",
    chooseAmount: "Choose amount",
    amigosLargeAmounts: "Amounts over $5000",
    amigosTaxDeductible: "Option through Amigos of Costa Rica, tax-deductible in the United States",
    donationOpenError: "Could not open the donation link.",
    donationsVisualOnly: "Donations view (visual only)",
    kosherListTitle: "List of authorized Kosher products",
    pesajTitle: "Kosher for Passover",
    pesajSubtitle: "Consult the official authorized list",
    categories: "Categories",
    // Home cards
    home_products_title: "Kosher Products",
    home_products_subtitle: "Check the official authorized list",
    home_products_button: "View products",
    home_news_title: "News",
    home_news_subtitle: "Important updates and notices",
    home_news_button: "View news",
    home_ad_title: "Advertisers",
    home_ad_subtitle: "Featured promotions and posts",
    home_ad_button: "View advertisers",
    home_donations_title: "Donations",
    home_donations_subtitle: "Support the work of Kosher supervision",
    home_donations_button: "Donate",
    // Common UI
    loadingProducts: "Loading products…",
    backendErrorTitle: "Could not reach the backend.",
    backendErrorHelp: "The app will retry automatically.",
    productCountSuffix: "products",
    // Navigation titles
    detail: "Detail",
    stores: "Stores",
    favorites: "Saved",
    calendar: "Calendar",
    adminAccess: "Admin access",
    adminProfile: "Admin profile",
    drawerAboutUs: "About us",
    drawerWhatIsKashrut: "What is Kosher?",
    drawerSupervisionCriteria: "Supervision & criteria",
    drawerHome: "Home",
    drawerAdmin: "Admin",
    drawerContact: "Contact",
    drawerPlaceholderText: "Information available",
    drawerContactInfo: "Email: certificacioneskosher@centroisraelita.com\nPhone: +506 2520-1013 ext. 117",
    drawerDonationText: "",
    drawerContactQuickActionsTitle: "Contact",
    drawerContactQuickActionsBody: "Choose an option.",
    drawerContactCallAction: "Call",
    drawerContactEmailAction: "Send email",
    drawerAboutInfo: "This application is an initiative of the Centro Israelita de Costa Rica, an Orthodox community institution that promotes Jewish life and kashrut in Costa Rica under the guidance of Rabbi Ytzhak Prober, chief rabbi.",
    logout: "Sign out",
    adminOnly: "Admins only",
    errorLoad: "Could not load.",
    errorTitle: "Error",
    retry: "Retry",
    noResults: "No results.",
    checkBackendToken: "Check backend and token.",
    cancel: "Cancel",
    apply: "Apply",
    clear: "Clear",
    back: "Back",
    close: "Close",
    loading: "Loading…",
    na: "N/A",
    filterByDate: "Filter by date",
    save: "Save",
    import: "Import",
    export: "Export",
    users: "Users",
    adminTitle: "Admin",
    adminCalendarTitle: "Calendar (Admin)",
    adminEventTitle: "Event",
    adminDashboard: "Dashboard",
    adminZone: "Admin area",
    adminChooseManage: "Choose what you want to manage.",
    adminProductsDesc: "Create, edit, delete, import/export",
    basicInfo: "Basic info",
    certification: "Certification",
    attributes: "Attributes",
    adminNewsDesc: "Posts, attachments and links",
    languageLabel: "Language",
    languageFlagsHelp: "Use flags to switch",
    offlineImagesLabel: "Offline content",
    offlineImagesActiveSummary: "Enabled · {{count}} files",
    offlineImagesDownloadPrompt: "Download offline content",
    offlineImagesDownloadStartedTitle: "Background download enabled",
    offlineImagesDownloadStartedBody: "The app will start saving products, news, restaurants, images, attachments and dynamic translations on the device for a better offline experience.",
    offlineImagesError: "Could not update offline mode.",
    offlineImagesProgressSummary: "Downloading {{downloaded}}/{{total}} ({{percent}}%)",
    refresh: "Refresh",
    backHome: "Go home",
    offlineImagesPromptTitle: "Background content download",
    offlineImagesPromptBody: "Do you want to download product images into a local folder on the phone so loading is faster and works better offline?",
    offlineDataLabel: "Offline data",
    offlineDataHint: "Deletes the downloaded local database and offline images.",
    offlineDataDeleteTitle: "Delete offline data",
    offlineDataDeleteBody: "This will delete the downloaded local cache and saved images. If you are offline, the app will have no cached data until you sync again.\n\nDo you want to continue?",
    offlineDataDeletedAndSynced: "Cache deleted and synced.",
    offlineDataDeletedOffline: "Cache deleted. You are offline: sync again when you are online.",
    notNow: "Not now",
    download: "Download",
    restaurantsTab: "Businesses",
    restaurantsTitle: "Restaurants and Businesses",
    restaurant: "Restaurant",
    restaurantsSearchPlaceholder: "Search restaurant, business or location...",
    home_restaurants_title: "Restaurants and Businesses",
    home_restaurants_subtitle: "Authorized locations, hours and contact methods",
    home_restaurants_button: "View businesses",
    advertisersTitle: "Advertisers",
    all: "All",
    notifyUsers: "Notify users",
    notifyUsersHelp: "Shows an in-app alert and a local notification when this news item is published.",
    moreInformation: "More information",
    loadingRestaurants: "Loading restaurants...",
    noRestaurantsYet: "There are no restaurants or businesses yet.",
    about: "About",
    businessHours: "Business hours",
    contact: "Contact",
    contactMethods: "Contact methods",
    phone: "Phone",
    whatsapp: "WhatsApp",
    callNow: "Call now",
    openWhatsApp: "Open WhatsApp",
    sendEmail: "Send email",
    address: "Address",
    openLocation: "Open location",
    openInMaps: "Open in Maps",
    adminRestaurantsDesc: "Locations, hours, contact methods and bilingual details",
    restaurantSaved: "Restaurant or business created.",
    restaurantUpdated: "Restaurant or business updated.",
    restaurantDeleted: "Restaurant or business deleted.",
    couldNotSaveRestaurant: "Could not save the restaurant or business.",
    restaurantRequiredFields: "Spanish name and business type are required.",
    newRestaurant: "New restaurant or business",
    editRestaurant: "Edit restaurant or business",
    restaurantNameEs: "Restaurant or business name (ES)",
    restaurantNameEn: "Restaurant or business name (EN)",
    businessTypeEs: "Business type (ES)",
    businessTypeEn: "Business type (EN)",
    restaurantImage: "Store image",
    locationEs: "Location (ES)",
    locationEn: "Location (EN)",
    aboutEs: "About (ES)",
    aboutEn: "About (EN)",
    businessHoursEs: "Business hours (ES)",
    businessHoursEn: "Business hours (EN)",
    phoneValueLabel: "Phone",
    phoneDescriptionEs: "Phone description (ES)",
    phoneDescriptionEn: "Phone description (EN)",
    whatsappValueLabel: "WhatsApp",
    whatsappDescriptionEs: "WhatsApp description (ES)",
    whatsappDescriptionEn: "WhatsApp description (EN)",
    emailValueLabel: "Email",
    emailDescriptionEs: "Email description (ES)",
    emailDescriptionEn: "Email description (EN)",
    contactEs: "Contact (ES)",
    contactEn: "Contact (EN)",
    addressEs: "Address (ES)",
    addressEn: "Address (EN)",
    addressLink: "Address link",
    adminRestaurantsSummaryTitle: "Restaurant management",
    adminRestaurantsSummaryCopy: "The view was reorganized so editing, hiding or deleting is easier from the phone.",
    businessCountLabel: "locations",
    visibleLabel: "Visible",
    hiddenLabel: "Hidden",
    restaurantsAutofillCopy: "Autofill EN for descriptive fields and reuse existing translations for name and type.",
    englishFieldsAutofilled: "English fields were autofilled.",
    englishFieldsAutofillError: "English fields could not be autofilled.",
    relatedNewsHidden: "{{count}} related news items were also hidden.",
    relatedNewsShown: "{{count}} related news items were shown again.",
    userCreated: "User created.",
    userUpdated: "User updated.",
    userDeleted: "User deleted.",
    couldNotCreateUser: "Could not create the user.",
    couldNotUpdateUser: "Could not update the user.",
    couldNotDeleteUser: "Could not delete the user.",
    requiredFieldsUsersMsg: "Name, email and password are required when creating a user.",
    deleteUser: "Delete user",
    delete: "Delete",
    adminSessionRequired: "Your admin session expired or has not been restored yet. Please sign in again.",
    noUsersYet: "There are no users yet.",
    noProductsYet: "There are no products yet.",
    name: "Name",
    nombre: "Name",
    email: "Email",
    password: "Password",
    passwordOptional: "Password (optional)",
    passwordKeepHint: "Leave empty to keep the current password.",
    newAdmin: "New admin",
    editAdmin: "Edit admin",
    adminCreateHint: "Create a new admin user.",
    adminEditHint: "Update the admin user details.",
    loginRequiredFields: "Enter email and password.",
    accessDenied: "Access denied",
    adminOnlyAccess: "This access is for administrators only.",
    couldNotLogin: "Could not sign in",
    profile: "Profile",
    role: "Role",
    login: "Sign in",
    adminAccessHelp: "Press and hold the logo for 5 seconds to open this access.",
    yesterday: "Yesterday",
    date: "Date",
    noNewsPublishedToday: "No news has been published yet.",
    noAdsPublishedToday: "No ads have been published yet.",
    noItemsForSelectedDate: "There are no posts for the selected date.",
    adminLogsDesc: "View and export API logs",
    admins: "Administrators",
    homeKosherList: "Kosher List",
    // Titles under search bar
    newsKashrutTitle: "Kosher News",
    advertiseHere: "Advertise here!",
    // Products HomeCard (quick filter)
    home_veg_title: "Kosher for Passover",
    home_veg_subtitle: "Consult the official authorized list",
    home_veg_button: "View products",
    home_passover_button: "Authorized Passover",
    home_liquors_button: "Kosher Liquors",
    // Posts
    untitled: "(Untitled)",
    openAttachment: "Open attachment",
    couldNotOpenLink: "Could not open the link.",
    linkNotAvailable: "Link not available.",
    createEvent: "Create event",
    noEventsYet: "No events yet.",
    noNewsYet: "No news yet.",
    noAdsYet: "No advertisers yet.",
    description: "Description",
    location: "Location",
    locationLabel: "Location",
    allDay: "All day",
    start: "Start",
    endOptional: "End (optional)",
    removeEnd: "Remove end",
    preview: "Preview:",
    titleRequired: "Title *",
    title: "Title",
    content: "Content",
    destination: "Destination",
    advertisers: "Advertisers",
    adminPosts: "Posts (Admin)",
    optional: "optional",
    fileUrlOptional: "fileUrl (optional)",
    imageUrlOptional: "imageUrl (optional)",
    // Filters / UI
    filters: "Filters",
    filterBy: "Filter by",
    filtersActive: "You have active filters",
    filtersNone: "No filters applied",
    filtersHint: "Choose one or more filters and apply the changes.",
    labelCategory: "Category",
    labelBrand: "Brand",
    filterHintApply: "Adjust what you need and press “Apply”.",
    donationLinkLabel: "Use the following link for donations:",
    donateHere: "Donate here",

    // Admin products form/alerts
    done: "Done",
    error: "Error",
    saving: "Saving…",
    updating: "Updating…",
    newProduct: "New product",
    editProduct: "Edit product",
    confirmDelete: "Delete",
    requiredFields: "Required fields",
    requiredFieldsProductsMsg: "Fill catGeneral, categoria1, fabricanteMarca and nombre.",
    productCreated: "Product created",
    productUpdated: "Product updated",
    productDeleted: "Product deleted",
    couldNotCreateProduct: "Could not create product.",
    couldNotUpdateProduct: "Could not update product.",
    couldNotDeleteProduct: "Could not delete product.",
    couldNotDelete: "Could not delete.",
    importCompleted: "Import completed",
    importFailed: "Import failed",
    exportFailed: "Export failed",
    fileCreated: "File created",
    savedAt: "Saved at",
    permissionDenied: "Permission denied",
    deleteEventTitle: "Delete event",

    // Logs / backend URL
    logs: "Logs",
    exportLogs: "Export logs",
    clearLogs: "Clear logs",
    backendUrl: "Backend (URL)",
    saveBackendUrl: "Backend updated",
    resetBackendUrl: "Backend restored",
    reset: "Reset",

    // Products fields
    catGeneral: "EN General Categories",
    categoria1: "EN Sub Categorie",
    fabricanteMarca: "Brand",
    atributo1: "EN Status",
    atributo2: "EN Quality 2",
    atributo3: "Attribute 3",
    tienda: "EN Store",
    selloOptional: "EN Hechsher",
    certificaOptional: "EN Certification",

    results: "Results",
    search: "Search",
    select: "Select…",
    seeMore: "See more",
    donateCtaBody: "Their contribution helps maintain and strengthen Kosher supervision efforts in Costa Rica",
    eventsAgenda: "Events / agenda",
    eventsRegistered: "Registered events",
    noImage: "No image",
    certifiesLabel: "Certified by",
    storeLabel: "Store",
    removeFromFavorites: "Remove from favorites",
    saveProduct: "Save product",
    sealAndCertification: "Seal & certification",
    productInfo: "Product information",
    policyLawLabel: "Policy / law",
    priceLabel: "Price / pesach",
},
};

type Dict = Record<string, string>;

export type I18nContextValue = {
  lang: Lang;
  setLang: (l: Lang) => Promise<void>;
  /**
   * Traduce usando DB primero. La key puede ser:
   * - una llave (ej: "products")
   * - o un literal exacto (ej: "Cargando productos…") si así lo guardas en DB
   */
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** diccionario remoto/cacheado (por si lo ocupas en debug) */
  dict: Dict;
};

const I18nContext = createContext<I18nContextValue | null>(null);

async function fetchRemoteDict(lang: Lang): Promise<Dict | null> {
  const cachedSql = await getI18nDict(lang);
  const headers = cachedSql?.etag ? { "If-None-Match": cachedSql.etag } : undefined;

  try {
    const res = await api.get<any>(`/i18n/${lang}`, {
      headers,
      validateStatus: (s) => (s >= 200 && s < 300) || s === 304,
    } as any);

    if (res.status === 304) {
      return cachedSql?.dict ?? {};
    }

    const dict = (res.data?.strings ?? res.data) as Dict;
    if (dict && typeof dict === "object") {
      const etag = (res.headers as any)?.etag as string | undefined;
      await saveI18nDict(lang, dict, etag ?? null);
      return dict;
    }
  } catch {}

  return cachedSql?.dict ?? null;
}

async function loadCachedDict(lang: Lang): Promise<Dict | null> {
  const cacheKey = `${CACHE_KEY_PREFIX}${lang}`;

  try {
    const cachedSql = await getI18nDict(lang);
    if (cachedSql?.dict && typeof cachedSql.dict === "object") {
      return cachedSql.dict;
    }
  } catch {}

  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

async function persistDictCache(lang: Lang, dict: Dict) {
  try {
    await AsyncStorage.setItem(`${CACHE_KEY_PREFIX}${lang}`, JSON.stringify(dict));
  } catch {}
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("es");
  const [dictByLang, setDictByLang] = useState<Record<Lang, Dict>>({ es: {}, en: {} });
  const [, startTransition] = useTransition();
  const langRef = useRef<Lang>("es");

  const hydrateLanguage = useCallback(async (targetLang: Lang, opts?: { forceRemote?: boolean; silent?: boolean }) => {
    await initOfflineDb();

    const cached = await loadCachedDict(targetLang);
    if (cached && Object.keys(cached).length) {
      setDictByLang((prev) => (prev[targetLang] === cached ? prev : { ...prev, [targetLang]: cached }));
    }

    if (!ENV.USE_REMOTE) return cached ?? null;

    const lastFetchKey = `${I18N_LAST_FETCH_PREFIX}${targetLang}`;
    const lastFetchRaw = await AsyncStorage.getItem(lastFetchKey);
    const lastFetch = lastFetchRaw ? Number(lastFetchRaw) : 0;
    const shouldFetch = !!opts?.forceRemote || !lastFetch || Date.now() - lastFetch >= I18N_FETCH_COOLDOWN_MS;

    if (!shouldFetch) return cached ?? null;

    const remote = await fetchRemoteDict(targetLang);
    await AsyncStorage.setItem(lastFetchKey, String(Date.now()));

    if (remote && typeof remote === "object") {
      setDictByLang((prev) => ({ ...prev, [targetLang]: remote }));
      await persistDictCache(targetLang, remote);
      return remote;
    }

    return cached ?? null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const saved = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
      const initialLang = saved === "en" ? "en" : "es";
      langRef.current = initialLang;
      if (!cancelled) {
        startTransition(() => setLangState(initialLang));
      }

      const activeDict = await hydrateLanguage(initialLang, { forceRemote: false });
      if (!cancelled && activeDict && langRef.current === initialLang) {
        setDictByLang((prev) => ({ ...prev, [initialLang]: activeDict }));
      }

      const secondaryLang: Lang = initialLang === "es" ? "en" : "es";
      void hydrateLanguage(secondaryLang, { forceRemote: false });
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrateLanguage, startTransition]);

  const setLang = useCallback(async (nextLang: Lang) => {
    if (nextLang === langRef.current) return;

    langRef.current = nextLang;
    startTransition(() => setLangState(nextLang));

    try {
      await AsyncStorage.setItem(STORAGE_KEY, nextLang);
    } catch {}

    if (!dictByLang[nextLang] || !Object.keys(dictByLang[nextLang]).length) {
      void hydrateLanguage(nextLang, { forceRemote: false });
    }

    const backgroundLang: Lang = nextLang === "es" ? "en" : "es";
    void hydrateLanguage(backgroundLang, { forceRemote: false });
  }, [dictByLang, hydrateLanguage, startTransition]);

  const value = useMemo<I18nContextValue>(() => {
    const currentDict = dictByLang[lang] ?? {};
    const fb = (fallback as any)[lang] as Dict;

    return {
      lang,
      setLang,
      dict: currentDict,
      t: (key: string, vars?: Record<string, string | number>) => {
        const k = String(key ?? "");
        const remoteValue = currentDict?.[k];
        const fallbackValue = fb?.[k];
        const isMissingTranslation =
          typeof remoteValue !== "string" ||
          !remoteValue.trim() ||
          remoteValue === k ||
          /^drawer/i.test(remoteValue.trim());
        const template = isMissingTranslation ? (fallbackValue ?? k) : remoteValue;
        if (!vars) return template;
        return String(template).replace(/\{\{(\w+)\}\}/g, (_, name) => String(vars?.[name] ?? ""));
      },
    };
  }, [dictByLang, lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
