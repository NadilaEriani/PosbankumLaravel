import { Head, Link, useForm } from "@inertiajs/react";
import { useEffect, useState } from "react";

import brandLogo from "../../assets/logo.png";
import mascotImage from "../../assets/burung1.png";
import "../../../css/loginPage.css";

function ArrowLeftIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function ArrowRightIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M5 12H19"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
            />
            <path
                d="M13 6L19 12L13 18"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function MailIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M4 7L10.94 11.84C11.57 12.28 12.43 12.28 13.06 11.84L20 7"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <rect
                x="3"
                y="5"
                width="18"
                height="14"
                rx="2.8"
                stroke="currentColor"
                strokeWidth="1.9"
            />
        </svg>
    );
}

function LockIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M7 10V8C7 5.24 9.24 3 12 3C14.76 3 17 5.24 17 8V10"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
            />
            <rect
                x="5"
                y="10"
                width="14"
                height="11"
                rx="2.8"
                stroke="currentColor"
                strokeWidth="1.9"
            />
        </svg>
    );
}

function EyeIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M2 12C3.73 8.11 7.52 5.5 12 5.5C16.48 5.5 20.27 8.11 22 12C20.27 15.89 16.48 18.5 12 18.5C7.52 18.5 3.73 15.89 2 12Z"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <circle
                cx="12"
                cy="12"
                r="3"
                stroke="currentColor"
                strokeWidth="1.9"
            />
        </svg>
    );
}

function EyeOffIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M3 3L21 21"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
            />
            <path
                d="M10.58 10.58C10.21 10.95 10 11.46 10 12C10 13.1 10.9 14 12 14C12.54 14 13.05 13.79 13.42 13.42"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M9.36 5.36C10.21 5.12 11.09 5 12 5C16.48 5 20.27 7.61 22 11.5C21.34 12.99 20.39 14.31 19.22 15.39"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M6.61 6.61C4.7 7.81 3.16 9.48 2 11.5C3.73 15.39 7.52 18 12 18C13.83 18 15.54 17.56 17.03 16.78"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export default function LoginPage({ status, googleLoginUrl }) {
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm({
            email: "",
            password: "",
            remember: false,
        });

    useEffect(() => {
        setData({
            email: "",
            password: "",
            remember: false,
        });

        clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const submit = (event) => {
        event.preventDefault();

        post("/login", {
            onError: () => {
                setData({
                    email: "",
                    password: "",
                    remember: false,
                });
            },
            onFinish: () => reset("password"),
        });
    };

    const handleGoogleLogin = () => {
        const targetUrl = googleLoginUrl || "/auth/google/redirect";
        window.location.assign(targetUrl);
    };

    return (
        <div className="loginPage">
            <Head title="Login" />

            <Link href="/" className="loginBackBtn">
                <ArrowLeftIcon />
                Kembali ke Beranda
            </Link>

            <div className="loginWrap">
                <section className="loginHeroCard">
                    <div className="loginCorner loginCornerTop" />
                    <div className="loginCorner loginCornerBottom" />

                    <div className="loginBrandPill">
                        <div className="loginBrandLogo">
                            <img src={brandLogo} alt="Logo Posbankum" />
                        </div>
                        <span>POSBANKUM</span>
                    </div>

                    <h1>Posbankum</h1>
                    <p>Platform Bantuan Hukum Terpercaya</p>

                    <div className="loginMascotBox">
                        <img src={mascotImage} alt="Maskot Posbankum" />
                    </div>

                    <div className="loginStats">
                        <div>
                            <strong>1,800+</strong>
                            <span>Posbankum</span>
                        </div>
                        <div>
                            <strong>1K+</strong>
                            <span>Paralegal</span>
                        </div>
                        <div>
                            <strong>100+</strong>
                            <span>Kasus</span>
                        </div>
                    </div>
                </section>

                <section className="loginFormCard">
                    <div className="loginFormHead">
                        <h2>Selamat Datang</h2>
                        <p>Masuk ke akun Posbankum Anda</p>
                    </div>

                    <form
                        onSubmit={submit}
                        className="loginForm"
                        autoComplete="off"
                    >
                        {status ? (
                            <div className="loginSuccessBox">{status}</div>
                        ) : null}

                        {errors.email ? (
                            <div className="loginErrorBox">{errors.email}</div>
                        ) : null}

                        {errors.password ? (
                            <div className="loginErrorBox">
                                {errors.password}
                            </div>
                        ) : null}

                        <button
                            type="button"
                            className="loginGoogleBtn"
                            onClick={handleGoogleLogin}
                            disabled={processing}
                        >
                            <span
                                className="loginGoogleMark"
                                aria-hidden="true"
                            >
                                G
                            </span>
                            <span>Masuk dengan Google</span>
                        </button>

                        <div className="loginDivider">
                            <span>atau masuk dengan email dan kata sandi</span>
                        </div>

                        <label className="loginField">
                            <span>
                                Email<b>*</b>
                            </span>
                            <div className="loginInputBox">
                                <MailIcon />
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="nama@email.com"
                                    value={data.email}
                                    onChange={(event) =>
                                        setData("email", event.target.value)
                                    }
                                    disabled={processing}
                                    autoComplete="off"
                                    required
                                />
                            </div>
                        </label>

                        <label className="loginField">
                            <span>
                                Kata Sandi<b>*</b>
                            </span>
                            <div className="loginInputBox">
                                <LockIcon />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    placeholder="Masukkan kata sandi"
                                    value={data.password}
                                    onChange={(event) =>
                                        setData("password", event.target.value)
                                    }
                                    disabled={processing}
                                    autoComplete="new-password"
                                    required
                                />
                                <button
                                    type="button"
                                    className="loginEyeBtn"
                                    onClick={() =>
                                        setShowPassword((value) => !value)
                                    }
                                    disabled={processing}
                                    aria-label={
                                        showPassword
                                            ? "Sembunyikan kata sandi"
                                            : "Lihat kata sandi"
                                    }
                                >
                                    {showPassword ? (
                                        <EyeOffIcon />
                                    ) : (
                                        <EyeIcon />
                                    )}
                                </button>
                            </div>
                        </label>

                        <div className="loginOptions">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={data.remember}
                                    onChange={(event) =>
                                        setData(
                                            "remember",
                                            event.target.checked,
                                        )
                                    }
                                    disabled={processing}
                                />
                                Ingat saya
                            </label>
                            <Link href="#">Lupa kata sandi?</Link>
                        </div>

                        <div className="loginCaptchaBox">
                            <span className="loginCaptchaCheck">✓</span>
                            <span>I'm not a robot</span>
                            <small>CAPTCHA</small>
                        </div>

                        <button
                            type="submit"
                            className="loginSubmitBtn"
                            disabled={processing}
                        >
                            <span>{processing ? "Memproses..." : "Masuk"}</span>
                            {!processing ? <ArrowRightIcon /> : null}
                        </button>
                    </form>

                    <div className="loginTerms">
                        Dengan masuk, Anda menyetujui{" "}
                        <a href="#">Syarat & Ketentuan</a> serta{" "}
                        <a href="#">Kebijakan Privasi</a>
                    </div>
                </section>
            </div>
        </div>
    );
}
