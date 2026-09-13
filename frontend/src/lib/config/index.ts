const VITE_API_URL = import.meta.env.VITE_API_URL || "/api";
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "0.0.1";
const APP_ENV = import.meta.env.VITE_APP_ENV;

const ORCHESTRA_LOGO_URL =
	import.meta.env.VITE_ORCHESTRA_LOGO_URL ||
	"https://github.com/mifunedev/static/blob/master/ruska_logo_200.png?raw=true";

const TOKEN_NAME = "orchestra:auth:token";
const PIXELS_FROM_TOP = 70;

export {
	VITE_API_URL,
	TOKEN_NAME,
	PIXELS_FROM_TOP,
	APP_VERSION,
	APP_ENV,
	ORCHESTRA_LOGO_URL,
};
