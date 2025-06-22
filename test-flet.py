#!/usr/bin/env python3
"""
Quick test to verify Flet is working properly
"""

import sys

def test_flet_installation():
    """Test if Flet is properly installed"""
    print("Testing Flet installation...")
    
    try:
        import flet as ft
        print("✅ flet imported successfully")
    except ImportError as e:
        print(f"❌ flet import failed: {e}")
        return False
    
    try:
        import flet_desktop
        print("✅ flet_desktop imported successfully")
    except ImportError as e:
        print(f"❌ flet_desktop import failed: {e}")
        return False
    
    return True

def test_simple_app():
    """Test a minimal Flet app"""
    import flet as ft
    
    def main(page: ft.Page):
        page.title = "Flet Test"
        page.add(
            ft.Text("✅ Flet is working!", size=20, color=ft.Colors.GREEN),
            ft.ElevatedButton("Test Button", on_click=lambda e: print("Button clicked!"))
        )
    
    print("Starting test app...")
    try:
        # This will open briefly and close
        ft.app(target=main, name="Flet Test")
        print("✅ Flet app test completed successfully")
        return True
    except Exception as e:
        print(f"❌ Flet app test failed: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Flet Installation Test")
    print("=" * 40)
    
    # Test 1: Import test
    if not test_flet_installation():
        print("\n❌ Flet installation test failed")
        print("Run: pip install flet[desktop]")
        sys.exit(1)
    
    print("\n✅ All tests passed!")
    print("Flet is properly installed and ready to use.")
    print("\nYou can now run:")
    print("  python trading_control_app_fixed.py")