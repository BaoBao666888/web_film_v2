import os
import sys
import time
import signal
import subprocess

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)
RECOMMEND_DIR = os.path.join(BASE_DIR, "recommend")

SERVICES = [
    {
        "name": "chatbot",
        "script": os.path.join(BASE_DIR, "chatbot", "api_chatbot.py"),
        "port_env": "AI_CHATBOT_PORT",
        "default_port": "5005",
    },
    {
        "name": "search",
        "script": os.path.join(BASE_DIR, "search", "api_search.py"),
        "port_env": "AI_SEARCH_PORT",
        "default_port": "5001",
    },
    {
        "name": "comment_filter",
        "script": os.path.join(BASE_DIR, "comment", "api_comment_filter.py"),
        "port_env": "AI_COMMENT_PORT",
        "default_port": "5002",
    },
    {
        "name": "recommend",
        "command": [sys.executable, "-m", "uvicorn", "api_main:app"],
        "port_env": "AI_RECOMMEND_PORT",
        "default_port": "5003",
        "cwd": RECOMMEND_DIR,
    },
]


def start_services():
    processes = []
    for service in SERVICES:
        env = os.environ.copy()
        env.setdefault("AI_HOST", "0.0.0.0")
        port_env = service.get("port_env")
        default_port = service.get("default_port")
        if port_env and default_port:
            env.setdefault(port_env, default_port)

        if "command" in service:
            port_value = env.get(port_env, default_port) if port_env else None
            command = list(service["command"])
            if port_value:
                command += ["--host", env["AI_HOST"], "--port", str(port_value)]
        else:
            command = [sys.executable, service["script"]]

        process = subprocess.Popen(
            command,
            cwd=service.get("cwd") or ROOT_DIR,
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
