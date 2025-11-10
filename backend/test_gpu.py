"""
Test script to verify GPU is being used for PPE detection
"""
import sys
import os
import time
import torch
import cv2
import numpy as np

# Add the parent directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.detector import get_detector
from app.core.logger import get_logger

logger = get_logger(__name__)

def test_gpu_detection():
    """Test GPU detection performance"""
    print("=" * 60)
    print("GPU Detection Performance Test")
    print("=" * 60)

    # Check PyTorch GPU availability
    print(f"\nPyTorch version: {torch.__version__}")
    print(f"CUDA available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"CUDA version: {torch.version.cuda}")
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        print(f"GPU count: {torch.cuda.device_count()}")
    else:
        print("WARNING: CUDA is not available, using CPU")

    print("\n" + "=" * 60)
    print("Loading YOLO detector...")
    print("=" * 60)

    # Get detector (this will now use GPU)
    detector = get_detector()

    print("\n" + "=" * 60)
    print("Creating test frame...")
    print("=" * 60)

    # Create a test frame (random image)
    test_frame = np.random.randint(0, 255, (720, 1280, 3), dtype=np.uint8)

    print("\n" + "=" * 60)
    print("Running warm-up inference...")
    print("=" * 60)

    # Warm-up run (first run is usually slower)
    use_half = torch.cuda.is_available()
    print(f"Using FP16 (half precision): {use_half}")
    _ = detector.predict(test_frame, half=use_half, verbose=False)
    print("Warm-up complete!")

    print("\n" + "=" * 60)
    print("Running performance test (10 inferences)...")
    print("=" * 60)

    # Run multiple inferences to test performance
    num_runs = 10
    times = []

    for i in range(num_runs):
        start_time = time.time()
        results = detector.predict(test_frame, half=use_half, verbose=False)
        end_time = time.time()

        inference_time = (end_time - start_time) * 1000  # Convert to milliseconds
        times.append(inference_time)
        print(f"  Run {i+1:2d}: {inference_time:7.2f} ms")

    # Calculate statistics
    avg_time = sum(times) / len(times)
    min_time = min(times)
    max_time = max(times)
    fps = 1000 / avg_time

    print("\n" + "=" * 60)
    print("Performance Results:")
    print("=" * 60)
    print(f"  Average inference time: {avg_time:.2f} ms")
    print(f"  Min inference time:     {min_time:.2f} ms")
    print(f"  Max inference time:     {max_time:.2f} ms")
    print(f"  Estimated FPS:          {fps:.2f}")

    print("\n" + "=" * 60)
    print("GPU Memory Usage:")
    print("=" * 60)
    if torch.cuda.is_available():
        print(f"  Allocated: {torch.cuda.memory_allocated(0) / 1024**2:.2f} MB")
        print(f"  Cached:    {torch.cuda.memory_reserved(0) / 1024**2:.2f} MB")
    else:
        print("  N/A (CPU mode)")

    print("\n" + "=" * 60)
    print("Test Complete!")
    print("=" * 60)

    # Performance expectations
    print("\nPerformance Guide:")
    print("  GPU (RTX 3050):    5-15 ms per frame (66-200 FPS)")
    print("  CPU:              50-200 ms per frame (5-20 FPS)")
    print("\nIf you're seeing CPU-like performance, make sure:")
    print("  1. The model was loaded with .to('cuda')")
    print("  2. PyTorch with CUDA is properly installed")
    print("  3. NVIDIA drivers are up to date")

if __name__ == "__main__":
    test_gpu_detection()
