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
            image = Image.open(BytesIO(image_file.read()))
            image_file.seek(0)

            if image.format not in ['JPEG', 'PNG', 'JPG', 'WEBP']:
                return {'valid': False, 'error': f'Unsupported image format: {image.format}'}

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
