"""
License Management Module for Dev-X-Flow-Pro
Handles license validation, activation, and management
"""
import json
import hashlib
import platform
import uuid
import urllib.request
import urllib.error
import ssl
import tkinter as tk
from tkinter import messagebox, ttk
import os

class LicenseManager:
    """Manages software licensing for Dev-X-Flow-Pro"""
    
    # API Configuration
    API_BASE_URL = "http://localhost:3000/api"  # Update this for production
    API_KEY = "devxflow-desktop-key"
    
    # License file path
    LICENSE_FILE = os.path.join(os.path.expanduser("~"), ".devxflowpro_license.json")
    
    def __init__(self, parent=None):
        self.parent = parent
        self.license_data = self._load_license_file()
        self.device_id = self._generate_device_id()
    
    def _generate_device_id(self):
        """Generate a unique device ID based on hardware"""
        try:
            # Combine multiple system identifiers for uniqueness
            system_info = [
                platform.node(),  # Computer name
                platform.machine(),  # Machine type
                platform.processor(),  # Processor info
                str(uuid.getnode())  # MAC address
            ]
            device_string = "|".join(system_info)
            return hashlib.sha256(device_string.encode()).hexdigest()[:16]
        except Exception:
            # Fallback to random UUID if system info unavailable
            return str(uuid.uuid4())[:16]
    
    def _load_license_file(self):
        """Load saved license data from file"""
        try:
            if os.path.exists(self.LICENSE_FILE):
                with open(self.LICENSE_FILE, 'r') as f:
                    return json.load(f)
        except Exception as e:
            print(f"Error loading license file: {e}")
        return {}
    
    def _save_license_file(self, data):
        """Save license data to file"""
        try:
            with open(self.LICENSE_FILE, 'w') as f:
                json.dump(data, f, indent=2)
            return True
        except Exception as e:
            print(f"Error saving license file: {e}")
            return False
    
    def get_stored_license_key(self):
        """Get the stored license key"""
        return self.license_data.get('license_key', '')
    
    def save_license_key(self, license_key):
        """Save a license key to file"""
        self.license_data['license_key'] = license_key.upper().strip()
        return self._save_license_file(self.license_data)
    
    def clear_license(self):
        """Clear the stored license"""
        self.license_data = {}
        if os.path.exists(self.LICENSE_FILE):
            try:
                os.remove(self.LICENSE_FILE)
            except Exception:
                pass
    
    def validate_license(self, license_key=None, online=True):
        """
        Validate a license key
        
        Args:
            license_key: License key to validate (uses stored if None)
            online: Whether to validate online or use cached result
        
        Returns:
            dict: Validation result with 'valid' boolean and additional info
        """
        license_key = license_key or self.get_stored_license_key()
        
        if not license_key:
            return {'valid': False, 'error': 'No license key found'}
        
        # Check for cached offline validation
        if not online:
            cached_valid = self.license_data.get('cached_valid', False)
            cached_expires = self.license_data.get('cached_until', '')
            
            if cached_valid and cached_expires:
                from datetime import datetime
                try:
                    expires = datetime.fromisoformat(cached_expires.replace('Z', '+00:00'))
                    if datetime.now().astimezone() < expires:
                        return {'valid': True, 'cached': True, 'expires_at': cached_expires}
                except Exception:
                    pass
            
            return {'valid': False, 'error': 'Offline validation expired or unavailable'}
        
        # Online validation
        try:
            validation_data = {
                'license_key': license_key,
                'device_id': self.device_id
            }
            
            headers = {
                'Content-Type': 'application/json',
                'X-API-Key': self.API_KEY
            }
            
            req = urllib.request.Request(
                f"{self.API_BASE_URL}/validate",
                data=json.dumps(validation_data).encode('utf-8'),
                headers=headers,
                method='POST'
            )
            
            # Allow insecure connections for localhost (remove for production)
            ctx = ssl.create_default_context()
            if 'localhost' in self.API_BASE_URL:
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE
            
            with urllib.request.urlopen(req, timeout=10, context=ctx) as response:
                result = json.loads(response.read().decode('utf-8'))
                
                # Cache successful validation for offline use
                if result.get('valid'):
                    from datetime import datetime, timedelta
                    cache_until = (datetime.now().astimezone() + timedelta(days=7)).isoformat()
                    self.license_data['cached_valid'] = True
                    self.license_data['cached_until'] = cache_until
                    self.license_data['expires_at'] = result.get('license', {}).get('expires_at')
                    self._save_license_file(self.license_data)
                
                return result
                
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8')
            try:
                error_data = json.loads(error_body)
                return {'valid': False, 'error': error_data.get('error', 'Validation failed')}
            except json.JSONDecodeError:
                return {'valid': False, 'error': f'Server error: {e.code}'}
        except urllib.error.URLError as e:
            return {'valid': False, 'error': 'Cannot connect to license server', 'offline': True}
        except Exception as e:
            return {'valid': False, 'error': f'Validation error: {str(e)}'}
    
    def deactivate_device(self, license_key=None):
        """Deactivate this device from the license"""
        license_key = license_key or self.get_stored_license_key()
        
        if not license_key:
            return {'success': False, 'error': 'No license key found'}
        
        try:
            deactivation_data = {
                'license_key': license_key,
                'device_id': self.device_id
            }
            
            headers = {
                'Content-Type': 'application/json',
                'X-API-Key': self.API_KEY
            }
            
            req = urllib.request.Request(
                f"{self.API_BASE_URL}/validate/deactivate",
                data=json.dumps(deactivation_data).encode('utf-8'),
                headers=headers,
                method='POST'
            )
            
            ctx = ssl.create_default_context()
            if 'localhost' in self.API_BASE_URL:
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE
            
            with urllib.request.urlopen(req, timeout=10, context=ctx) as response:
                result = json.loads(response.read().decode('utf-8'))
                if result.get('success'):
                    self.clear_license()
                return result
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def get_license_status(self):
        """Get current license status for display"""
        license_key = self.get_stored_license_key()
        
        if not license_key:
            return {
                'has_license': False,
                'status_text': 'No license activated',
                'status_color': '#e74c3c'
            }
        
        # Try to get cached info
        expires_at = self.license_data.get('expires_at')
        cached_valid = self.license_data.get('cached_valid', False)
        
        if cached_valid and expires_at:
            from datetime import datetime
            try:
                expires = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
                now = datetime.now().astimezone()
                days_left = (expires - now).days
                
                if days_left < 0:
                    return {
                        'has_license': True,
                        'license_key': license_key[:8] + '...',
                        'status_text': 'License expired',
                        'status_color': '#e74c3c',
                        'expires_at': expires_at
                    }
                elif days_left < 7:
                    return {
                        'has_license': True,
                        'license_key': license_key[:8] + '...',
                        'status_text': f'Expires in {days_left} days',
                        'status_color': '#f39c12',
                        'expires_at': expires_at,
                        'days_left': days_left
                    }
                else:
                    return {
                        'has_license': True,
                        'license_key': license_key[:8] + '...',
                        'status_text': f'Active (expires {expires_at[:10]})',
                        'status_color': '#27ae60',
                        'expires_at': expires_at,
                        'days_left': days_left
                    }
            except Exception:
                pass
        
        return {
            'has_license': True,
            'license_key': license_key[:8] + '...',
            'status_text': 'License key stored (validation pending)',
            'status_color': '#f39c12'
        }


class LicenseDialog:
    """Dialog for license activation"""
    
    def __init__(self, parent, license_manager):
        self.parent = parent
        self.license_manager = license_manager
        self.dialog = None
        self.result = None
    
    def show(self):
        """Show the license dialog"""
        self.dialog = tk.Toplevel(self.parent)
        self.dialog.title("License Activation")
        self.dialog.geometry("500x350")
        self.dialog.resizable(False, False)
        self.dialog.transient(self.parent)
        self.dialog.grab_set()
        
        # Center the dialog
        self.dialog.update_idletasks()
        x = (self.dialog.winfo_screenwidth() // 2) - (500 // 2)
        y = (self.dialog.winfo_screenheight() // 2) - (350 // 2)
        self.dialog.geometry(f"500x350+{x}+{y}")
        
        self._create_widgets()
        
        # Wait for dialog to close
        self.parent.wait_window(self.dialog)
        return self.result
    
    def _create_widgets(self):
        # Title
        title = tk.Label(self.dialog, text="Activate Dev-X-Flow-Pro", 
                        font=('Segoe UI', 16, 'bold'))
        title.pack(pady=(20, 10))
        
        # Description
        desc = tk.Label(self.dialog, text="Enter your license key to activate the software",
                       font=('Segoe UI', 10))
        desc.pack()
        
        # License key entry
        frame = tk.Frame(self.dialog)
        frame.pack(pady=20, padx=40, fill='x')
        
        tk.Label(frame, text="License Key:", font=('Segoe UI', 10)).pack(anchor='w')
        
        self.key_entry = tk.Entry(frame, font=('Consolas', 14), width=25)
        self.key_entry.pack(fill='x', pady=(5, 0))
        self.key_entry.insert(0, self.license_manager.get_stored_license_key())
        
        # Format placeholder
        placeholder = tk.Label(frame, text="Format: XXXX-XXXX-XXXX-XXXX",
                              font=('Segoe UI', 9), fg='#666')
        placeholder.pack(anchor='w', pady=(5, 0))
        
        # Auto-format on typing
        self.key_entry.bind('<KeyRelease>', self._format_key)
        
        # Status label
        self.status_label = tk.Label(self.dialog, text="", font=('Segoe UI', 10))
        self.status_label.pack(pady=10)
        
        # Buttons
        btn_frame = tk.Frame(self.dialog)
        btn_frame.pack(pady=20)
        
        tk.Button(btn_frame, text="Activate", command=self._activate,
                 bg='#4a90e2', fg='white', font=('Segoe UI', 11),
                 width=12, cursor='hand2').pack(side='left', padx=5)
        
        tk.Button(btn_frame, text="Validate Later",
                 command=self._validate_later,
                 font=('Segoe UI', 11), width=12).pack(side='left', padx=5)
        
        # Buy link
        buy_link = tk.Label(self.dialog, text="Don't have a license? Buy now",
                           font=('Segoe UI', 10), fg='#4a90e2',
                           cursor='hand2')
        buy_link.pack(pady=10)
        buy_link.bind('<Button-1>', lambda e: self._open_buy_page())
    
    def _format_key(self, event=None):
        """Auto-format license key as user types"""
        key = self.key_entry.get().upper().replace('-', '').replace(' ', '')
        key = ''.join(c for c in key if c.isalnum())[:16]
        
        formatted = ''
        for i, c in enumerate(key):
            if i > 0 and i % 4 == 0:
                formatted += '-'
            formatted += c
        
        self.key_entry.delete(0, tk.END)
        self.key_entry.insert(0, formatted)
    
    def _activate(self):
        """Validate and activate license"""
        license_key = self.key_entry.get().strip()
        
        if len(license_key.replace('-', '')) != 16:
            self.status_label.config(text="Invalid key format", fg='#e74c3c')
            return
        
        self.status_label.config(text="Validating...", fg='#666')
        self.dialog.update()
        
        # Validate online
        result = self.license_manager.validate_license(license_key, online=True)
        
        if result.get('valid'):
            # Save the license
            self.license_manager.save_license_key(license_key)
            self.result = True
            messagebox.showinfo("Success", "License activated successfully!", parent=self.dialog)
            self.dialog.destroy()
        else:
            error_msg = result.get('error', 'Validation failed')
            if result.get('offline'):
                error_msg += "\n\nYou can validate later when online."
            self.status_label.config(text=error_msg, fg='#e74c3c')
    
    def _validate_later(self):
        """Close dialog and validate later"""
        self.result = False
        self.dialog.destroy()
    
    def _open_buy_page(self):
        """Open the buy page in browser"""
        import webbrowser
        webbrowser.open('http://localhost:3000/#pricing')


def check_license_on_startup(parent, show_dialog=True):
    """
    Check license on application startup
    
    Returns:
        bool: True if licensed or trial, False if should block
    """
    license_mgr = LicenseManager(parent)
    
    # Check if license exists
    license_key = license_mgr.get_stored_license_key()
    
    if not license_key:
        # No license - show activation dialog
        if show_dialog:
            dialog = LicenseDialog(parent, license_mgr)
            result = dialog.show()
            return result
        return False
    
    # Validate existing license
    result = license_mgr.validate_license(online=True)
    
    if result.get('valid'):
        return True
    
    # Check if offline
    if result.get('offline'):
        # Try offline validation
        offline_result = license_mgr.validate_license(online=False)
        if offline_result.get('valid'):
            return True
        # Show warning but allow use
        messagebox.showwarning("License Check", 
            "Cannot connect to license server. Using cached validation.",
            parent=parent)
        return True
    
    # License invalid - show dialog
    if show_dialog:
        error_msg = result.get('error', 'License validation failed')
        messagebox.showerror("License Error", error_msg, parent=parent)
        
        dialog = LicenseDialog(parent, license_mgr)
        result = dialog.show()
        return result
    
    return False
