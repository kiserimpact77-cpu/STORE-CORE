from http.server import BaseHTTPRequestHandler, HTTPServer
import json

HOST = "127.0.0.1"
PORT = 8765

barcode_queue = []


class BridgeHandler(BaseHTTPRequestHandler):

    def send_json(self, data, status=200):

        response = json.dumps(
            data,
            ensure_ascii=False
        ).encode("utf-8")

        self.send_response(status)

        self.send_header(
            "Content-Type",
            "application/json; charset=utf-8"
        )

        self.send_header(
            "Access-Control-Allow-Origin",
            "*"
        )

        self.send_header(
            "Access-Control-Allow-Methods",
            "GET, POST, OPTIONS"
        )

        self.send_header(
            "Access-Control-Allow-Headers",
            "Content-Type"
        )

        self.send_header(
            "Content-Length",
            str(len(response))
        )

        self.end_headers()

        self.wfile.write(response)


    def do_OPTIONS(self):

        self.send_json({
            "ok": True
        })


    def do_GET(self):

        if self.path == "/status":

            self.send_json({
                "running": True
            })

            return


        if self.path == "/next":

            barcode = None

            if barcode_queue:

                barcode = barcode_queue.pop(0)

            self.send_json({
                "barcode": barcode
            })

            return


        self.send_json(
            {
                "error": "Not found"
            },
            404
        )


    def do_POST(self):

        if self.path != "/barcode":

            self.send_json(
                {
                    "error": "Not found"
                },
                404
            )

            return


        try:

            content_length = int(
                self.headers.get(
                    "Content-Length",
                    0
                )
            )


            raw_data = self.rfile.read(
                content_length
            )


            data = json.loads(
                raw_data.decode("utf-8")
            )


            barcode = str(
                data.get(
                    "barcode",
                    ""
                )
            ).strip()


            if not barcode:

                self.send_json(
                    {
                        "ok": False,
                        "error": "Barcode is empty"
                    },
                    400
                )

                return


            barcode_queue.append(
                barcode
            )


            print(
                f"[SCANNER] {barcode}"
            )


            self.send_json({
                "ok": True,
                "barcode": barcode
            })


        except Exception as error:

            print(
                "[ERROR]",
                error
            )

            self.send_json(
                {
                    "ok": False,
                    "error": str(error)
                },
                500
            )


    def log_message(
        self,
        format,
        *args
    ):

        return


def start_server():

    server = HTTPServer(
        (HOST, PORT),
        BridgeHandler
    )


    print("=" * 50)

    print(
        "STORE CORE SCANNER BRIDGE"
    )

    print(
        f"http://{HOST}:{PORT}"
    )

    print(
        "Waiting for barcode..."
    )

    print(
        "Press CTRL+C to stop."
    )

    print("=" * 50)


    try:

        server.serve_forever()

    except KeyboardInterrupt:

        print(
            "\nBridge stopped."
        )

    finally:

        server.server_close()


if __name__ == "__main__":

    start_server()
