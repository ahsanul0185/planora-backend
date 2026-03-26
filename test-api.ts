import { auth } from './src/app/lib/auth'; console.log(Object.keys(auth.api).filter(key => key.toLowerCase().includes('otp') || key.toLowerCase().includes('email')));
