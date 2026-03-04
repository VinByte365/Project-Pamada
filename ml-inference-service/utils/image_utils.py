from PIL import Image
from io import BytesIO


def validate_image(image_file):
    try:
        if not image_file:
            return {'valid': False, 'error': 'No file provided'}

        image_file.seek(0, 2)
        file_size = image_file.tell()
        image_file.seek(0)

        if file_size > 10 * 1024 * 1024:
            return {'valid': False, 'error': 'File size exceeds 10MB limit'}

        try:
            image_bytes = image_file.read()
            image_file.seek(0)

            with Image.open(BytesIO(image_bytes)) as image:
                # Force decode to catch invalid/truncated files reliably.
                image.load()
                image_format = (image.format or '').upper()
                if image_format not in ['JPEG', 'PNG', 'JPG', 'WEBP']:
                    return {'valid': False, 'error': f'Unsupported image format: {image_format or "unknown"}'}

                width, height = image.size
                if width < 100 or height < 100:
                    return {'valid': False, 'error': 'Image dimensions too small (minimum 100x100)'}

                if width > 5000 or height > 5000:
                    return {'valid': False, 'error': 'Image dimensions too large (maximum 5000x5000)'}

            return {'valid': True}
        except Exception as exc:
            return {'valid': False, 'error': f'Invalid image file: {exc}'}
    except Exception as exc:
        return {'valid': False, 'error': f'Error validating image: {exc}'}
