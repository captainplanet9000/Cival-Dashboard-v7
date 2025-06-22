#!/usr/bin/env python3
"""
Trading Control App - Fixed Version
Fixed the flet_desktop import and exit() issues
"""

import sys
import builtins
# Fix the exit issue by ensuring exit is available
if not hasattr(builtins, 'exit'):
    builtins.exit = sys.exit

import flet as ft
import asyncio
import aiohttp
import json
from datetime import datetime

# Ensure flet-desktop is available
try:
    import flet_desktop
except ImportError:
    print("Installing flet-desktop...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "flet[desktop]"])
    import flet_desktop

class TradingControlApp:
    def __init__(self, page: ft.Page):
        self.page = page
        self.page.title = "🏦 Trading Dashboard Control"
        self.page.theme_mode = ft.ThemeMode.DARK
        self.page.bgcolor = ft.Colors.BLUE_GREY_900
        self.api_base = "http://localhost:8080"  # Updated to match your dashboard
        
        # State variables
        self.auto_trading = True
        self.risk_level = 25.0
        self.vault_balance = 1258473.25
        self.allocated_amount = 987654.32
        
    async def call_api(self, endpoint, data=None, method="POST"):
        """Call the Dashboard API"""
        try:
            async with aiohttp.ClientSession() as session:
                if method == "GET":
                    async with session.get(f"{self.api_base}{endpoint}") as response:
                        return await response.json()
                else:
                    async with session.post(f"{self.api_base}{endpoint}", 
                                          json=data, 
                                          headers={'Content-Type': 'application/json'}) as response:
                        return await response.json()
        except Exception as e:
            self.show_snackbar(f"API Error: {str(e)}", ft.Colors.RED)
            return None
    
    def show_snackbar(self, message, color=ft.Colors.GREEN):
        """Show notification"""
        self.page.show_snack_bar(
            ft.SnackBar(
                content=ft.Text(message, color=ft.Colors.WHITE),
                bgcolor=color
            )
        )
        
    def create_ai_enhanced_controls(self):
        """Create AI-Enhanced controls for PydanticAI integration"""
        ai_card = ft.Card(
            content=ft.Container(
                content=ft.Column([
                    ft.Row([
                        ft.Icon(ft.icons.PSYCHOLOGY, color=ft.Colors.PURPLE_400),
                        ft.Text("AI Enhanced Trading", 
                               size=20, 
                               weight=ft.FontWeight.BOLD,
                               color=ft.Colors.WHITE)
                    ]),
                    ft.Divider(color=ft.Colors.BLUE_GREY_700),
                    
                    # AI Status
                    ft.Row([
                        ft.Icon(ft.icons.SMART_TOY, color=ft.Colors.GREEN_400),
                        ft.Text("PydanticAI Status", size=16, color=ft.Colors.WHITE),
                        ft.Container(
                            content=ft.Text("Online", size=12, color=ft.Colors.WHITE),
                            bgcolor=ft.Colors.GREEN_400,
                            padding=ft.padding.symmetric(horizontal=8, vertical=4),
                            border_radius=5
                        )
                    ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN),
                    
                    # AI Analysis Buttons
                    ft.Row([
                        ft.ElevatedButton(
                            text="Analyze AAPL",
                            icon=ft.icons.ANALYTICS,
                            bgcolor=ft.Colors.BLUE_600,
                            color=ft.Colors.WHITE,
                            on_click=lambda _: self.analyze_symbol("AAPL"),
                            expand=True
                        ),
                        ft.ElevatedButton(
                            text="Analyze TSLA",
                            icon=ft.icons.ANALYTICS,
                            bgcolor=ft.Colors.BLUE_600,
                            color=ft.Colors.WHITE,
                            on_click=lambda _: self.analyze_symbol("TSLA"),
                            expand=True
                        )
                    ], spacing=10),
                    
                    # AI Features
                    ft.Column([
                        ft.Text("AI Features Active:", size=14, color=ft.Colors.BLUE_GREY_400),
                        ft.Row([
                            ft.Icon(ft.icons.CHECK_CIRCLE, color=ft.Colors.GREEN_400, size=16),
                            ft.Text("Type-safe decisions", size=12, color=ft.Colors.WHITE)
                        ]),
                        ft.Row([
                            ft.Icon(ft.icons.CHECK_CIRCLE, color=ft.Colors.GREEN_400, size=16),
                            ft.Text("Confidence scoring", size=12, color=ft.Colors.WHITE)
                        ]),
                        ft.Row([
                            ft.Icon(ft.icons.CHECK_CIRCLE, color=ft.Colors.GREEN_400, size=16),
                            ft.Text("Risk assessment", size=12, color=ft.Colors.WHITE)
                        ]),
                        ft.Row([
                            ft.Icon(ft.icons.CHECK_CIRCLE, color=ft.Colors.GREEN_400, size=16),
                            ft.Text("Google SDK integration", size=12, color=ft.Colors.WHITE)
                        ])
                    ], spacing=5)
                    
                ], spacing=15),
                padding=20,
                bgcolor=ft.Colors.BLUE_GREY_800,
                border_radius=10
            )
        )
        
        return ai_card
    
    async def analyze_symbol(self, symbol):
        """Trigger AI analysis for a symbol"""
        self.show_snackbar(f"Analyzing {symbol} with PydanticAI...", ft.Colors.BLUE)
        
        # Call the AI-enhanced trading API
        result = await self.call_api('/api/ai/trading', {
            'symbol': symbol,
            'account_id': 'demo-account-001',
            'market_data': {
                'current_price': 150 + (hash(symbol) % 100),
                'volume': 1000000 + (hash(symbol) % 500000),
                'volatility': 0.1 + (hash(symbol) % 50) / 100,
                'trend': 'up' if hash(symbol) % 2 else 'down'
            }
        })
        
        if result and result.get('pydantic_ai_enhanced'):
            decision = result.get('decision', {})
            confidence = result.get('confidence', 0) * 100
            self.show_snackbar(
                f"{symbol}: {decision.get('action', 'hold').upper()} "
                f"(Confidence: {confidence:.1f}%)", 
                ft.Colors.GREEN
            )
        else:
            self.show_snackbar(f"Analysis complete for {symbol} (fallback mode)", ft.Colors.ORANGE)
    
    def create_vault_controls(self):
        """Create vault management interface"""
        
        # Master Vault Status Card
        vault_card = ft.Card(
            content=ft.Container(
                content=ft.Column([
                    ft.Row([
                        ft.Icon(ft.icons.ACCOUNT_BALANCE, color=ft.Colors.BLUE_400),
                        ft.Text("Master Trading Vault", 
                               size=20, 
                               weight=ft.FontWeight.BOLD,
                               color=ft.Colors.WHITE)
                    ]),
                    ft.Divider(color=ft.Colors.BLUE_GREY_700),
                    
                    # Balance Display
                    ft.Row([
                        ft.Column([
                            ft.Text("Total Balance", 
                                   size=14, 
                                   color=ft.Colors.BLUE_GREY_400),
                            ft.Text(
                                f"${self.vault_balance:,.2f}", 
                                size=24, 
                                weight=ft.FontWeight.BOLD,
                                color=ft.Colors.GREEN_400
                            )
                        ], expand=True),
                        ft.Column([
                            ft.Text("Allocated", 
                                   size=14, 
                                   color=ft.Colors.BLUE_GREY_400),
                            ft.Text(
                                f"${self.allocated_amount:,.2f}", 
                                size=18, 
                                weight=ft.FontWeight.W_500,
                                color=ft.Colors.ORANGE_400
                            )
                        ], expand=True)
                    ]),
                    
                    # Progress Bar
                    ft.Column([
                        ft.Row([
                            ft.Text("Capital Allocation", 
                                   size=14, 
                                   color=ft.Colors.BLUE_GREY_400),
                            ft.Text(f"{(self.allocated_amount/self.vault_balance)*100:.1f}%", 
                                   size=14, 
                                   color=ft.Colors.WHITE)
                        ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN),
                        ft.ProgressBar(
                            value=(self.allocated_amount/self.vault_balance),
                            color=ft.Colors.BLUE_400,
                            bgcolor=ft.Colors.BLUE_GREY_800
                        )
                    ]),
                    
                    # Action Buttons
                    ft.Row([
                        ft.ElevatedButton(
                            text="Open Dashboard",
                            icon=ft.icons.DASHBOARD,
                            bgcolor=ft.Colors.GREEN_600,
                            color=ft.Colors.WHITE,
                            on_click=self.open_dashboard,
                            expand=True
                        ),
                        ft.ElevatedButton(
                            text="AI Enhanced",
                            icon=ft.icons.PSYCHOLOGY,
                            bgcolor=ft.Colors.PURPLE_600,
                            color=ft.Colors.WHITE,
                            on_click=self.open_ai_dashboard,
                            expand=True
                        )
                    ], spacing=10)
                ], spacing=15),
                padding=20,
                bgcolor=ft.Colors.BLUE_GREY_800,
                border_radius=10
            )
        )
        
        return vault_card
    
    async def open_dashboard(self, e):
        """Open the main dashboard"""
        import webbrowser
        webbrowser.open("http://localhost:8080")
        self.show_snackbar("Opening main dashboard...")
    
    async def open_ai_dashboard(self, e):
        """Open the AI-enhanced dashboard"""
        import webbrowser
        webbrowser.open("http://localhost:8080/dashboard/ai-enhanced")
        self.show_snackbar("Opening AI-enhanced dashboard...")
    
    def create_quick_status(self):
        """Create quick status overview"""
        status_card = ft.Card(
            content=ft.Container(
                content=ft.Column([
                    ft.Text("System Status", 
                           size=18, 
                           weight=ft.FontWeight.BOLD,
                           color=ft.Colors.WHITE),
                    ft.Divider(color=ft.Colors.BLUE_GREY_700),
                    
                    self.create_status_item("Dashboard", "Online", ft.Colors.GREEN),
                    self.create_status_item("PydanticAI", "Enhanced", ft.Colors.PURPLE),
                    self.create_status_item("Google SDK", "Connected", ft.Colors.BLUE),
                    self.create_status_item("A2A Protocol", "Active", ft.Colors.ORANGE),
                    
                ], spacing=10),
                padding=20,
                bgcolor=ft.Colors.BLUE_GREY_800,
                border_radius=10
            )
        )
        
        return status_card
    
    def create_status_item(self, name, status, status_color):
        """Create a status row"""
        return ft.Row([
            ft.Icon(ft.icons.CIRCLE, size=12, color=status_color),
            ft.Text(name, size=14, color=ft.Colors.WHITE, expand=True),
            ft.Container(
                content=ft.Text(status, size=12, color=ft.Colors.WHITE),
                bgcolor=status_color,
                padding=ft.padding.symmetric(horizontal=8, vertical=4),
                border_radius=5
            )
        ])
    
    def main(self):
        """Main app setup"""
        # App Bar
        self.page.appbar = ft.AppBar(
            title=ft.Text("🏦 Trading Control Center", color=ft.Colors.WHITE),
            bgcolor=ft.Colors.BLUE_GREY_800,
            actions=[
                ft.IconButton(
                    ft.icons.REFRESH,
                    on_click=lambda _: self.show_snackbar("Refreshing data..."),
                    tooltip="Refresh"
                ),
                ft.IconButton(
                    ft.icons.LAUNCH,
                    on_click=self.open_dashboard,
                    tooltip="Open Dashboard"
                )
            ]
        )
        
        # Main content
        content = ft.Column([
            # Top row
            ft.Row([
                ft.Container(
                    content=self.create_vault_controls(),
                    expand=2
                ),
                ft.Container(
                    content=self.create_quick_status(),
                    expand=1
                )
            ], expand=True),
            
            # Bottom row
            ft.Container(
                content=self.create_ai_enhanced_controls(),
                expand=False
            )
        ], spacing=20, expand=True)
        
        # Add content with padding
        self.page.add(
            ft.Container(
                content=content,
                padding=20,
                expand=True
            )
        )

def main(page: ft.Page):
    """Main entry point"""
    page.window_width = 800
    page.window_height = 700
    page.window_resizable = True
    
    app = TradingControlApp(page)
    app.main()

if __name__ == "__main__":
    try:
        # Run as desktop app with proper error handling
        print("Starting Trading Control Center...")
        print("Dashboard: http://localhost:8080")
        print("AI Enhanced: http://localhost:8080/dashboard/ai-enhanced")
        
        ft.app(
            target=main, 
            name="Trading Control Center",
            assets_dir="assets"
        )
    except Exception as e:
        print(f"Error starting app: {e}")
        print("Make sure flet[desktop] is installed: pip install flet[desktop]")
        sys.exit(1)