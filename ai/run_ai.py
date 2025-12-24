import os
import sys
import time
import signal
import subprocess

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)

SERVICES = [
    {
        "name": "chatbot",
        "script": os.path.join(BASE_DIR, "chatbot", "api_chatbot.py"),
        "port_env": "AI_CHATBOT_PORT",
        "default_port": "5005",
    }
]


def start_services():
    processes = []
    for service in SERVICES:
        env = os.environ.copy()
        env.setdefault("AI_HOST", "0.0.0.0")
        env.setdefault(service["port_env"], service["default_port"])
        process = subprocess.Popen(
            [sys.executable, service["script"]],
            cwd=ROOT_DIR,
            env=env,
        )
        processes.append((service["name"], process))
        print(f"[ai] started {service['name']} (pid={process.pid})")
    return processes


def stop_services(processes):
    for name, process in processes:
        if process.poll() is None:
            process.terminate()
            print(f"[ai] stopping {name} (pid={process.pid})")


def main():
    processes = start_services()

    def handle_signal(_signum, _frame):
        stop_services(processes)
        raise SystemExit(0)

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    try:
        while True:
            for name, process in processes:
                if process.poll() is not None:
                    print(f"[ai] {name} exited with code {process.returncode}")
                    stop_services(processes)
                    return
            time.sleep(1)
    finally:
        stop_services(processes)


if __name__ == "__main__":
    main()
