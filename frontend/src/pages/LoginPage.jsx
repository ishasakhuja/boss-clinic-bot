import { useState } from "react";
import { BASE_URL } from "../api";
import { login } from "../api";

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await login(email, password);
      onLogin(user);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

 
  const EyeIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="var(--hex-login-placeholder)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="var(--hex-login-placeholder)" strokeWidth="2" />
    </svg>
  );

  const EyeOffIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" stroke="var(--hex-login-placeholder)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" stroke="var(--hex-login-placeholder)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.12 14.12a3 3 0 11-4.24-4.24" stroke="var(--hex-login-placeholder)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="1" y1="1" x2="23" y2="23" stroke="var(--hex-login-placeholder)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );

  return (
    <div
      className="w-full min-h-screen flex flex-col lg:flex-row overflow-y-auto"
      style={{ fontFamily: "'Open Sans', sans-serif", backgroundColor: 'var(--primary-bg)' }}
    >
      <div
        className="hidden lg:flex lg:w-[55%] relative overflow-hidden lg:min-h-screen"
        style={{
          backgroundImage: "linear-gradient(128.25deg, var(--hex-green-pure) 0%, var(--hex-green-950) 50%, var(--hex-green-pure) 100%)"
        }}
      >
        <div className="absolute left-0 top-0 w-full h-full opacity-10 pointer-events-none">
          <div
            className="absolute left-[10%] top-[10%] w-80 h-80 rounded-full"
            style={{
              background: 'var(--login-blur-primary)',
              filter: 'blur(82px)'
            }}
          />
          <div
            className="absolute left-[25%] top-[50%] w-96 h-96 rounded-full"
            style={{
              background: 'var(--login-blur-secondary)',
              filter: 'blur(82px)'
            }}
          />
        </div>
        <div className="relative flex flex-col gap-24 p-12 xl:p-12 max-w-3xl">
          <div className="flex flex-col gap-8 max-w-2xl">
            <div className="flex flex-col">
              <img
                src="/richgrologo.svg"
                alt="Richgro"
                style={{ width: '330.333px', height: '125.754px', opacity: 1, marginBottom: '80px' }}
              />
              <h3 className="text-4xl font-bold leading-tight mb-4" style={{ color: 'var(--hex-white)' }}>
                Grow Better with Australia's<br />
                Trusted Garden Brand
              </h3>
              <p className="text-base leading-relaxed" style={{ color: 'var(--accent-green-bg)' }}>
                Proudly Australian-made fertilisers and garden care products, helping Australians grow healthier gardens for over 30 years.
              </p>
            </div>

            <div className="flex flex-col gap-6">
              <div className="flex gap-4 items-start">
                <div className="flex items-center justify-center w-12 h-12 rounded-full shrink-0" style={{ background: 'var(--login-feature-icon-bg)' }}>
                  <img alt="Premium Quality Products" className="w-6 h-6" src="/premiumqualityproducts.svg" />
                </div>
                <div className="flex-1">
                  <h4 className="text-base font-semibold leading-relaxed" style={{ color: 'var(--hex-white)' }}>
                    Premium Quality Products
                  </h4>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--accent-green-bg)' }}>
                    High-quality fertilisers and soil solutions made for Australian conditions.
                  </p>
                </div>
              </div>             
              <div className="flex gap-4 items-start">
                <div className="flex items-center justify-center w-12 h-12 rounded-full shrink-0" style={{ background: 'var(--login-feature-icon-bg)' }}>
                  <img alt="Expert Garden Solutions" className="w-6 h-6" src="/expertgardensolutions.svg" />
                </div>
                <div className="flex-1">
                  <h4 className="text-base font-semibold leading-relaxed" style={{ color: 'var(--hex-white)' }}>
                    Expert Garden Solutions
                  </h4>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--accent-green-bg)' }}>
                    Tailored care for lawns, vegetables, natives and ornamentals.
                  </p>
                </div>
              </div>              
              <div className="flex gap-4 items-start">
                <div className="flex items-center justify-center w-12 h-12 rounded-full shrink-0" style={{ background: 'var(--login-feature-icon-bg)' }}>
                  <img alt="Sustainable & Eco-Friendly" className="w-6 h-6" src="/sustainableandeco.svg" />
                </div>
                <div className="flex-1">
                  <h4 className="text-base font-semibold leading-relaxed" style={{ color: 'var(--hex-white)' }}>
                    Sustainable & Eco-Friendly
                  </h4>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--accent-green-bg)' }}>
                    Responsibly made products that care for your garden and the environment.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>      
      <div className="flex-1 flex items-start lg:items-center justify-center p-8 lg:p-12" style={{ backgroundColor: 'var(--primary-bg)' }}>
        <div className="w-full max-w-md pb-12">
          <div className="flex flex-col gap-2 mb-8">
            <p className="text-4xl font-bold" style={{ color: 'var(--login-heading)' }}>
              Sign in to your account
            </p>
            <p className="text-base" style={{ color: 'var(--login-heading)' }}>
              Enter your credentials to access the admin dashboard
            </p>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">            
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium" style={{ color: 'var(--login-heading)' }}>
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
                className="w-full h-12 px-4 py-2 border rounded-lg text-sm transition focus:outline-none"
                style={{
                  background: 'var(--login-input-bg)',
                  color: 'var(--login-heading)',
                  borderColor: 'var(--primary-border)'
                }}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-sm font-medium" style={{ color: 'var(--login-heading)' }}>
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full h-12 px-4 py-2 pr-12 border rounded-lg text-sm transition focus:outline-none"
                  style={{
                    background: 'var(--login-input-bg)',
                    color: 'var(--login-heading)',
                    borderColor: 'var(--primary-border)'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center hover:opacity-60 transition focus:outline-none"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
            {error && (
              <div className="px-4 py-3 rounded-lg text-sm border" style={{ backgroundColor: 'var(--login-error-bg)', borderColor: 'var(--danger)', color: 'var(--danger)' }}>
                {error}
              </div>
            )}
            {/* <div className="flex items-center gap-2">
              <div
                onClick={() => setRememberMe(!rememberMe)}
                className="w-4 h-4 rounded cursor-pointer flex items-center justify-center transition"
                style={{
                  background: rememberMe ? 'var(--accent-green)' : 'var(--login-input-bg)',
                  border: `1.5px solid var(--secondary-border)`
                }}
              >
                {rememberMe && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M1 4L3.5 6.5L9 1"
                      stroke="var(--hex-white)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>

              {/* <label
                className="text-sm cursor-pointer select-none"
                onClick={() => setRememberMe(!rememberMe)}
                style={{ color: 'var(--login-heading)' }}
              >
                Remember me
              </label> */}
            {/* </div> 
            */} 
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-white text-base rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--hex-green-pure)' }}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          <div className="mt-8 text-center">
            <p className="text-base" style={{ color: 'var(--login-footer-text)' }}>
              Need help?{' '}
              <a
                className="font-semibold cursor-pointer hover:underline"
                style={{ color: 'var(--accent-green)' }}
                href="mailto:sharma@byte-digital.com.au"
              >
                Contact support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
